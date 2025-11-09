## Inspiration
In a generation where people find the love of their lives on an app, we seek to get users in their dream cars in a similar way!

## What it does
CarTender uses modern agent frameworks as well as personalization to find the best car for YOU.

Answer a few simple questions (mostly about your finances and some car must-haves) to get started. CarTender's agents then go to work: aggregating reviews, listings, rankings and other info online to provide you suggestions that you could swipe left or right on like a dating app (CarTinder??) 

Agents are also used to guide you through the purchasing process, providing the best rates, insurance quotes, maintenance and inspection plans.

## How we built it
Vue.js frontend, Flask backend
LangGraph agents running on NVIDIA-nemotron-nano-9b-v2
Compute, ML and LLM hosted on NVIDIA L4 24 gb instance on Brev.
Numerous APIs for car info, review, sentiment, financial, etc. information

## Challenges we ran into
Designing semantic embeddings and personalization pipelines that capture subtle preferences (e.g., “no American cars,” “must have CarPlay”)
Balancing agent complexity with latency - LLM reasoning can be slow
Managing hosted GPU compute on Brev vs. simpler serverless architectures

## Accomplishments that we're proud of
A fully agentic end to end car matchmaking platform in 24 hours
Multi agent orchestration
Submitting :)

## What we learned
How to host and tune large models like Nemotron efficiently on GPU instances
Practical challenges of balancing response time, caching, and reasoning depth in multi-agent systems
How to combine structured APIs with unstructured LLM reasoning for real-world decision making
