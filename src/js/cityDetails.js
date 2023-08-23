/* global document */

const setUpDetails = (map, markerGroup, data) => {
    markerGroup.on("click", function(e){
        const cityState = e.sourceTarget.getTooltip().getContent();
        cityData = data[cityState];
        console.log(cityData);

        cityInfo = 
        `<h2><a href="${cityData["citation_url"]}">${cityState}</h2>
        <p>Detailed Information and Citations</p></a>
        <p>${cityData["report_summary"]}</p>
        <p>Population: ${cityData["population"]}</p>
        <p>Type of Reform: ${cityData["report_type"]}</p>
        <p>Reform Status: ${cityData["report_status"]}</p>
        <p>Scope of Reform: ${cityData["report_magnitude"]}</p>
        <p>Land Uses: ${cityData["land_uses"]}</p>
        `;

        document.querySelector(".city-details-text").innerHTML = cityInfo;
    });
};

export default setUpDetails;