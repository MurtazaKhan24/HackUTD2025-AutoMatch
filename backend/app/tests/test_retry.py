import time
import random

def retry_stub(func, retries=2):
    for i in range(retries):
        try:
            return func()
        except Exception:
            time.sleep(random.uniform(0.1, 0.5))
    raise RuntimeError("Failed after retries")

def test_retry_success():
    assert retry_stub(lambda: 42) == 42

def test_retry_failure():
    try:
        retry_stub(lambda: (_ for _ in ()).throw(Exception("fail")), retries=2)
    except RuntimeError:
        assert True
    else:
        assert False
