NPM=npm
NODE=node

.PHONY: test

run: install config.json
	$(NODE) judge.js

install:
	$(NPM) install

config.json: config.sample.json
	cp -f $< $@

test:
	$(NPM) run test
