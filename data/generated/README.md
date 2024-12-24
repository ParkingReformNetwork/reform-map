# Mandates Map data set

This folder contains the data used for https://parkingreform.org/resources/mandates-map/.

## CSV files

The CSV `any_parking_reform.csv` gives high-level information on each place, including which types of parking reforms it has implemented.

For more granular data, such as the reform status and date of reform, use one of the three more specific CSVs:

* `add_maximums.csv`: data on parking maximum reforms
* `reduce_minimums.csv`: data on parking minimum reduction reforms
* `remove_minimums.csv`: data on parking minimum repeals

## JSON

The full data set is stored in `complete-data.json`. 

This JSON file is more powerful and ergonomic than the CSV file because of it's support for string arrays. For example, a place may have multiple values for  affected land use, which is more naturally represented in the JSON.

It can be helpful to use the tool [`jq`](https://jqlang.github.io/jq/tutorial/) when working with JSON data. Consider using online tutorials and generative AI like ChatGPT or Claude for help with creating `jq` queries.

## Citations

Use of this data set should be attributed to "Parking Reform Network" with a link to https://parkingreform.org/resources/mandates-map/ and the date the data was downloaded.
