#!/usr/bin/bash

if [-e data/pullflag]
then
	git pull
	rm -f data/pullflag
fi

