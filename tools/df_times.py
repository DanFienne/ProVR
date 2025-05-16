import datetime
import json


def load_config():
    with open('config.json', 'r', encoding='utf-8') as f:
        config = json.load(f)
        return config


def create_timestamp():
    current_time = datetime.datetime.now()
    time_stamp = current_time.timestamp()
    return time_stamp
