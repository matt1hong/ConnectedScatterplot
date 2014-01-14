#!/usr/bin/python

from os import listdir
import json
import sys

dirname = 'data/'+sys.argv[1]
trials = []
for fname in listdir(dirname):
	trials.append(json.load(open(dirname+'/'+fname, 'r')))

with open(dirname+'.json', 'wb') as outfile:
	json.dump(trials, outfile)

