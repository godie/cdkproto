#!/bin/sh
artillery run --output test-run-report.json apiwgtest.yml
artillery report --output report.html test-run-report.json