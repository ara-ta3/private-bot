NPM=npm
NODE=node

run: install config.json
	$(NODE) judge.js

install:
	$(NPM) install

config.json: config.sample.json
	cp -f $< $@
