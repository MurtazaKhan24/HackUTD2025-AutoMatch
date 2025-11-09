import os
import json
import logging
from typing import Annotated, Any, Sequence

from langchain_core.runnables import RunnableConfig
from langchain_nvidia_ai_endpoints import ChatNVIDIA
from langgraph.graph import END, START, StateGraph
from langgraph.graph.message import add_messages
from pydantic import BaseModel
from dotenv import load_dotenv

from . import tool  # your local tool module

# Setup logging
_LOGGER = logging.getLogger(__name__)
if not _LOGGER.hasHandlers():
    logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')

_MAX_LLM_RETRIES = 3


load_dotenv()
burl = os.getenv("FARIS_VM")

# Initialize model
llm = ChatNVIDIA(
    base_url=burl,
    model="nvidia/NVIDIA-Nemotron-Nano-9B-v2",
    temperature=0.0,
    api_key="no-key-required",
    max_completion_tokens=2048
)
llm_with_tools = llm.bind_tools([tool.search_auto_dev])


# --- Define State ---
class AutoDevState(BaseModel):
    """Holds the agent’s state."""
    make: str
    model: str
    year: int
    zip: str
    distance: int
    limit: int
    messages: Annotated[Sequence[Any], add_messages] = []


# --- Tool Node ---
async def tool_node(state: AutoDevState):
    """Executes tool calls from the last model message."""
    _LOGGER.info("Executing tool calls.")
    outputs = []

    last_message = state.messages[-1]
    tool_calls = getattr(last_message, "tool_calls", None)
    if not tool_calls:
        _LOGGER.warning("No tool calls found in last message.")
        return {"messages": []}

    for tool_call in tool_calls:
        tool_name = tool_call.get("name")
        tool_args = tool_call.get("args", {})
        _LOGGER.info("Executing tool call: %s with args: %s", tool_name, tool_args)

        # Ensure the tool exists
        if not hasattr(tool, tool_name):
            _LOGGER.error(f"Tool '{tool_name}' not found.")
            continue

        try:
            tool_function = getattr(tool, tool_name)
            result = await tool_function.ainvoke(tool_args)

            # ✅ Ensure valid JSON output
            if isinstance(result, str):
                try:
                    result = json.loads(result)
                except json.JSONDecodeError:
                    _LOGGER.warning("Tool returned non-JSON string; wrapping as JSON.")
                    result = {"result": result}
            elif not isinstance(result, dict):
                result = {"result": result}

            outputs.append({
                "role": "tool",
                "content": result,  # ✅ Send JSON directly, not json.dumps
                "name": tool_name,
                "tool_call_id": tool_call.get("id"),
            })
        except Exception as e:
            _LOGGER.exception("Error during tool execution: %s", e)
            outputs.append({
                "role": "tool",
                "content": {"error": str(e)},
                "name": tool_name,
                "tool_call_id": tool_call.get("id"),
            })

    return {"messages": outputs}


# --- Model Call Node ---
async def call_model(state: AutoDevState, config: RunnableConfig) -> dict[str, Any]:
    """Calls the model. If no messages yet, triggers tool. Otherwise summarizes."""
    _LOGGER.info("Calling model.")

    if not state.messages:
        _LOGGER.info("Creating initial user prompt for tool trigger.")
        user_prompt = (
            f"Use the search_auto_dev tool to find car listings for the following parameters:\n"
            f"- Make: {state.make}\n"
            f"- Model: {state.model}\n"
            f"- Year: {state.year}\n"
            f"- ZIP code: {state.zip}\n"
            f"- Search radius (miles): {state.distance}\n"
            f"- Maximum number of results: {state.limit}\n\n"
            "Do NOT ask for any of these parameters — they are already provided and must be trusted.\n"
            "If the tool finds listings, output each listing in this exact format:\n"
            "Price: (Price)\n"
            "Vehicle: (Year) (Make) (Model)\n"
            "Location: (Dealer), (City), (State)\n"
            "VIN: (VIN)\n\n"
            "If no listings are found, respond exactly with: 'No listings found for these parameters.'"
        )
        messages = [
            {"role": "system", "content": "/no_think"},
            {"role": "user", "content": user_prompt}
        ]
    else:
        _LOGGER.info("Passing messages (likely tool output) to model.")
        messages = [{"role": "system", "content": "/no_think"}] + list(state.messages)

    for count in range(_MAX_LLM_RETRIES):
        try:
            response = await llm_with_tools.ainvoke(messages, config)
            if response:
                return {"messages": [response]}
        except Exception as e:
            _LOGGER.exception("Model call failed on attempt %d: %s", count + 1, e)

        _LOGGER.warning("Retrying model call... (%d/%d)", count + 1, _MAX_LLM_RETRIES)

    raise RuntimeError(f"Failed to call model after {_MAX_LLM_RETRIES} attempts.")


# --- Helper: Detect Tool Calls ---
def has_tool_calls(state: AutoDevState) -> bool:
    messages = state.messages
    if not messages:
        return False
    last_message = messages[-1]
    return bool(getattr(last_message, "tool_calls", None))


# --- Build Graph ---
workflow = StateGraph(AutoDevState)
workflow.add_node("agent", call_model)
workflow.add_node("tools", tool_node)

workflow.add_edge(START, "agent")
workflow.add_conditional_edges("agent", has_tool_calls, {True: "tools", False: END})
workflow.add_edge("tools", "agent")

graph = workflow.compile()


# --- Example Runner ---
import asyncio

async def run_graph():
    _LOGGER.info("Starting graph run...")
    initial_input = {
        "make": "Toyota",
        "model": "GR Supra",
        "year": 2023,
        "zip": "75080",
        "distance": 200,
        "limit": 3
    }

    final_state = await graph.ainvoke(initial_input)

    _LOGGER.info("Graph run complete.")
    print("\n--- Final Response ---")
    last_message = final_state["messages"][-1]
    content = getattr(last_message, "content", None)
    print(json.dumps(content, indent=2) if isinstance(content, (dict, list)) else content)


if __name__ == "__main__":
    asyncio.run(run_graph())
