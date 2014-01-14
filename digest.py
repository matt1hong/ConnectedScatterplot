#!/usr/bin/python

from os import listdir
import json
import sys

trials = []
for fname in listdir('data/'+sys.argv[1]):
	trials.append(json.load(open(fname, 'r')))

print trials