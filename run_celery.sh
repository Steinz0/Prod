#!/bin/sh
export DISPLAY=:1
cd gameEngine/runFiles
celery -A simple_example worker --loglevel INFO
# python simple_example.py