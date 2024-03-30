# sla-map-app

Custom visualization to map the SLA values by two-letter country code.
Supports two methods to combine multiple queries values: Average or Multiply.

## Getting started

Select which account you want to run this on:
```
nr1 profiles:default
```

Next update the nerdpack id for that account:
```
nr1 nerdpack:uuid -g
```
*Note:  Don't commit the nr1.json file to the repo, this contains your UUID.*

Install the node packages:
```
npm install
```

## Running the local version

Now you are ready to run:
```
npm start
```
Visit https://one.newrelic.com/?nerdpacks=local and :sparkles:

## Deploy the visualization

When you are ready to deploy to your account:
```
nr1 nerdpack:publish
nr1 nerdpack:subscribe
```

## Limitations

This version runs the queries at the beginning only, when the component loads.
A timer to refresh the queries has not been implemented.
