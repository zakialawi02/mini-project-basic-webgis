import * as L from "leaflet";
import "./leaflet.polyline.measure.js";
import "./leaflet.qgsmeasure.css";

L.Control.QgsMeasure = L.Control.extend({
  options: {
    position: 'topleft',
    shapeOptions: {
      color: "#d07f03",
      stroke: true,
      weight: 4,
      opacity: 0.7,
      fill: false,
      clickable: true,
    },
    icon: new L.DivIcon({
      iconSize: new L.Point(9, 9),
      className: 'leaflet-div-icon leaflet-editing-icon',
    }),
    text: {
      title: 'Measure distances',
      segments_title: 'Segments (meters)',
      segments_from: "From ",
      segments_to: "to ",
      segments_total: 'Total: ',
      segments_meters: "m",
    },
  },

  initialize(options) {
    options = options || {};
    /*
      This fix this situation: The user change only one text option, then all the
      this.options.text object is replaced by the new one, so the other options are lost,
      showing "undefined" in the segments box.
    */
    options.text = L.Util.extend(this.options.text, options.text);

    L.Util.setOptions(this, options);
  },

  enabled() {
    return this._handler.enabled();
  },

  toggle() {
    if (this._handler.enabled()) {
      this._map.fire("qgsmeasure:measurestop");
      this._handler.disable.call(this._handler);
    } else {
      this._map.fire("qgsmeasure:measurestart");
      this._handler.enable.call(this._handler);
    }
  },

  getSegments() {
    return this._handler.getSegments();
  },

  _createTextElement(tag, className, container, text) {
    L.DomUtil.create(tag, className, container).innerText = text;
  },

  _createSegmentContainer() {
    if (this._segments_container) {
      return;
    }

    /* Getting the leaflet top right container */
    const [topleft] = document.getElementsByClassName("leaflet-top leaflet-right");

    /* Box over the map containing all data */
    this._segments_container = L.DomUtil.create('div', `segments-container leaflet-control`, topleft);

    /* Prevents zoom map when scroll over the container */
    L.DomEvent.disableScrollPropagation(this._segments_container);

    /* Box Title */
    this._createTextElement('span', 'segments-title', this._segments_container, this.options.text.segments_title);

    /* Box containing all the measures */
    this._segments_measures_container = L.DomUtil.create('div', "segments-measures-container", this._segments_container);

    /* Box containing the Sum of distances (it's separate from measures to stay on bottom) */
    this._segments_total_distance_container = L.DomUtil.create('div', "segments-total-distance-container", this._segments_container);

    /* Initialize total distance text */
    this._total_distance_text_reset = `${this.options.text.segments_total} 0 ${this.options.text.segments_meters}`;
    this._createTextElement('span', '', this._segments_total_distance_container, this._total_distance_text_reset);
    this._total_distance_text_element = document.getElementsByClassName('segments-total-distance-container')[0].firstChild;
  },

  _startMeasure(e) {
    let { segments } = e;
    const lastSegment = segments.at(-1);

    const from = this.options.text.segments_from;
    const to = this.options.text.segments_to;
    const meters = this.options.text.segments_meters;

    let totalDistance = segments.reduce((acc, segment) => acc + segment.distance, 0);

    const text = `${from} ${lastSegment.from} ${to} ${lastSegment.to} = ${lastSegment.distance.toFixed(2)} ${meters}`;

    this._createTextElement('span', 'segment-measure', this._segments_measures_container, text);

    this._total_distance_text_element.innerText = `${this.options.text.segments_total} ${totalDistance.toFixed(3)} ${this.options.text.segments_meters}`;

    this._segments_container.scrollTop = this._segments_measures_container.scrollHeight;
  },

  _finishMeasure() {
    while (this._segments_measures_container.firstChild) {
      this._segments_measures_container.removeChild(this._segments_measures_container.firstChild);
    }
    this._total_distance_text_element.innerText = this._total_distance_text_reset;
  },

  onAdd(map) {
    this._handler = new L.Polyline.Measure(map, this.options);

    if (this.options.button) {
      L.DomEvent.on(this.options.button, "click", this.toggle, this);
      return L.DomUtil.create('div', 'leaflet-bar'); // Leaflet needs a DOM element returned
    }

    this._map.on("qgsmeasure:measurestart", this._createSegmentContainer, this);
    this._map.on("qgsmeasure:newsegment", this._startMeasure, this);
    this._map.on("qgsmeasure:newmeasure", this._finishMeasure, this);

    this._handler.on('enabled', () => {
      L.DomUtil.addClass(this._segments_container, 'show');
    }, this);

    this._handler.on('disabled', () => {
      L.DomUtil.removeClass(this._segments_container, 'show');
      this._finishMeasure();
    }, this);

    let link = null;
    let className = 'leaflet-control-draw';
    this._container = L.DomUtil.create('div', 'leaflet-bar');
    link = L.DomUtil.create('a', `${className}-measure`, this._container);
    link.href = '#';
    link.title = this.options.text.title;

    L.DomEvent
      .addListener(link, 'click', L.DomEvent.stopPropagation)
      .addListener(link, 'click', L.DomEvent.preventDefault)
      .addListener(link, 'click', this.toggle, this);

    return this._container;
  },

  onRemove() {
    if (this.options.button) {
      L.DomEvent.off(this.options.button, 'click', this.toggle, this);
    }
  },
});

L.Map.mergeOptions({
  measureControl: false,
});

L.Map.addInitHook(function () {
  if (this.options.measureControl) {
    this.measureControl = L.Control.qgsmeasure()
      .addTo(this);
  }
});

L.Control.qgsmeasure = (options) => new L.Control.QgsMeasure(options);
