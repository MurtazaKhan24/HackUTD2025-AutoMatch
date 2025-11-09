from app.utils.normalize import normalize_feature

def test_normalize_feature():
    assert normalize_feature("Bluetooth") == "bluetooth"
    assert normalize_feature("Heated Seats") == "heated seats"
