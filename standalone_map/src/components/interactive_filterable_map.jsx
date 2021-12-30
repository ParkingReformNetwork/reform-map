import { useMemo, useState } from "preact/hooks";
import MarkerMapLeaflet from "./marker_map_leaflet";

function _cityDetailPageUrl(row) {
    let basename = `${row.city}_${row.state}`;
    basename = basename.replaceAll(" ", "");
    return `https://parkingreform.org/mandates-map/city_detail/${basename}.html`
}

function numberWithCommas(x) {
    return x.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

const _colorMap = new Map([
    ["City Center", "#fdae61"],
    ["Citywide", "#d7191c"],
    ["Main Street", "#abdda4"],
    ["TOD", "#2b83ba"],
])

function fillColorForRow(row) {
    return _colorMap.get(row.magnitude_encoded)
}

// function _formatPopulation(number_str) {
//     function numberWithCommas(x) {
//         return x.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
//     }
// }

function prepareMarkers(parsed_csv) {
    let seenIds = new Set();

    return parsed_csv.filter(row => row.lat && row.long)
        .filter(row => {
            const shouldInclude = !seenIds.has(row.id);
            seenIds.add(row.id);
            return shouldInclude;
        })
        .map(row => (
            {
                latlng: [row.lat, row.long],
                title: `${row.city}, ${row.state}`,
                radius: 7,
                stroke: false,
                fillColor: fillColorForRow(row),
                fillOpacity: 0.9,
                popupContent: `
                <h3><a href="${_cityDetailPageUrl(row)}">${row.city}, ${row.state}</a></h3> 
                <span class="attr"><label>Population:</label> ${numberWithCommas(row.population)}</span>
                <div class="summary">${row.report_summary}</div>
                <span class="attr"><label>Scope:</label> ${row.report_magnitude}</span>
                <span class="attr"><label>Land Use:</label> ${row.land_uses}</span>
                <span class="attr"><label>Status:</label> ${row.report_status}</span>
                <span class="more"><a href="${_cityDetailPageUrl(row)}">(more info with citations)</a></span>
                `,
            }
        ));
}

export default function InteractiveFilterableMap(props) {
    let { parsed_csv } = props;

    const markers = useMemo(() => prepareMarkers(parsed_csv), [parsed_csv])

    return (
        <MarkerMapLeaflet markers={markers} />
    )

}