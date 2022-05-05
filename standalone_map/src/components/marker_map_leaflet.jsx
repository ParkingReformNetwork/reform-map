import Leaflet from 'leaflet';
import { Component, createRef } from 'preact';

function makeMarker(spec) {
    let m = Leaflet.circleMarker(spec.latlng, { ...spec })
    m.bindTooltip(spec.title);
    if (spec.popupContent) {
        m.bindPopup(spec.popupContent)
    }
    if (spec.onClick) {
        m.on('click', spec.onClick);
    }
    return m
}


export default class MarkerMapLeaflet extends Component {
    ref = createRef()

    constructor() {
        super();
        this.map = undefined;
        this.markerGroup = Leaflet.layerGroup([], { pane: 'markerPane' });
        // this.markerGroup.on('click', ev => this.onClickMarkerGroup(ev));
    }

    componentDidMount() {
        console.log('didmount map', this.ref.current);
        this.map = Leaflet.map(this.ref.current, {
            center: [45.5, -122.6],
            zoom: 13,
        })
        this.map.fitBounds([
            { "lat": 68.83996333131492, "lng": -44.05843734741212 },
            { "lat": -9.209935267174554, "lng": -174.83968734741214 },
        ]);
        this.map.addLayer(this.markerGroup);
        console.log('adding tile layer');
        Leaflet.tileLayer('https://api.mapbox.com/styles/v1/{id}/tiles/{z}/{x}/{y}?access_token={accessToken}', {
            attribution: 'Map data &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors, Imagery © <a href="https://www.mapbox.com/">Mapbox</a>',
            maxZoom: 18,
            id: 'mapbox/streets-v11',
            tileSize: 512,
            zoomOffset: -1,
            accessToken: 'pk.eyJ1IjoiZXpoIiwiYSI6IlpQQ01TR2cifQ.LuIx3e1Ez52srjbRHymXNg'
        }).addTo(this.map);
        this.map.on('resize', ev => {
            console.log('bounds', this.map.getBounds());
            console.log('view', this.map.getCenter(), this.map.getZoom());
        })
    }

    onClickMarkerGroup(ev) {
        console.log('onClickMarkerGroup', ev);
    }

    render(props, state) {
        console.log('render ref', this.ref.current, 'render map', this.map?._container);
        console.log('equal?', this.ref.current === this.map?._container);
        const { markers } = props;
        console.log('render marker specs', markers);

        this.markerGroup.clearLayers()
        for (let spec of markers) {
            this.markerGroup.addLayer(makeMarker(spec))
        }
        return (
            <div ref={this.ref} class="MarkerMapLeaflet"></div>
        )
    }
}