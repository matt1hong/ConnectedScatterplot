#!/bin/bash

if [ -e "data/pullflag" ]
then
	git pull > /dev/null
	rm -f data/pullflag
fi

