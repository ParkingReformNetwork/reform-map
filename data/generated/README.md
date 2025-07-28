# Parking Reform Map data set

This folder contains the data used for https://parkingreform.org/resources/mandates-map/, which records places/governments that have implemented parking reform.

## CSV files

There are six CSV files:

- `overview_adopted.csv`: an overview of all places that have adopted reforms
- `overview_proposed.csv`: an overview of all places that have proposed new reforms, but not yet passed them
- `overview_repealed.csv`: an overview of all places that have repealed prior reforms
- `add_maximums.csv`: parking maximum policies
- `reduce_minimums.csv`: parking minimum reductions
- `remove_minimums.csv`: parking minimum removals

## JSON

`complete-data.json` contains the full dataset with additional features not available in the CSVs, such as array support and citation information.

For working with JSON data, we recommend using [`jq`](https://jqlang.github.io/jq/tutorial/), a command-line tool for filtering and transforming JSON. Online tutorials and AI assistants like ChatGPT can help you create `jq` queries.

## Attribution

Please attribute to "Parking Reform Network" with a link to https://parkingreform.org/resources/mandates-map/ and include the data download date.
