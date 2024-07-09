class MapGraph extends Graph {
    //Graph Constructor
    constructor(_data, _config, _dispatch, _hoverDispatch) {
        super();
        this.data = _data

        //dispatchers
        this.hoverdispatch = _hoverDispatch;
        this.dispatch = _dispatch

        //Map Data
        this.mapPathsFile = 'data/worldMapPaths.json'
        this.radius = 1.2
        this.countriesWithLargeAreaButSmallDisplayArea = ["Japan", "Italy"]
        this.config = {
            parentElement: _config.parentElement,
            infoDensityIndex: _config.infoDensityIndex,
            containerWidth: _config.containerWidth || 1400,
            containerHeight: _config.containerWidth || 450,
            margin: {top: 45, right: 35, bottom: 65, left: 25},
        }
        //padding for tooltip
        this.tooltipPaddingX = 20
        this.tooltipPaddingY = 20

        //map zoom and translation, based on selected view
        this.mapZoom = 110
        this.mapTranslate = [this.config.containerWidth / 2, this.config.containerHeight / 1.4]
        this.duration = 100
        //Color settings
        this.colorRange = ["#fff", '#74a9cf']
        this.highlightColor = '#ffae42';

        //Views rollup on Data
        this.views = d3.rollup(this.data, v => d3.sum(v, d => d.non_en_page_views), d => d.bplace_country)

        //State of the component
        this.selectedCountry = ''
        this.selectedCountryG = undefined
        this.selectedCountryPath = undefined
        this.highlightCountry = '';
        this.highlightID = "";
        this.highlightedOccupation = '';
        this.isZoomed = false;
        this.activeOccupation = '';
        this.initVis()
    }

    /**
     * Initialize Components and Perform pre data processing
     */
    initVis() {
        let vis = this
        vis.width = vis.config.containerWidth - vis.config.margin.left - vis.config.margin.right;
        vis.height = vis.config.containerHeight - vis.config.margin.top - vis.config.margin.bottom;
        // Define size of SVG drawing area
        vis.svg = d3.select(vis.config.parentElement)
            .attr('width', vis.config.containerWidth)
            .attr('height', vis.config.containerHeight);
        vis.zoom = d3.zoom()
            .scaleExtent([1, 8])
            .on("zoom", (event, d) => zoomed(event, d, vis))

        vis.viewsDomain = [Math.min(...vis.views.values()), Math.max(...vis.views.values())]

        vis.colorScale = d3.scaleSqrt()
            .domain(vis.viewsDomain)
            .range(vis.colorRange)
            .interpolate(d3.interpolateRgb);

        vis.peopleByCountry = vis.reduceInfoDensityByCountry(vis)

        vis.renderLegend()
        vis.renderVis()

    }

    /**
     * Update data/scales and render components
     */
    updateVis() {
        let vis = this

        vis.legend.remove()

        // reduce information density in countries with lots of marks
        vis.peopleByCountry = vis.reduceInfoDensityByCountry(vis)

        vis.views = d3.rollup(vis.data, v => d3.sum(v, d => d.non_en_page_views), d => d.bplace_country)
        vis.viewsDomain = [Math.min(...vis.views.values()), Math.max(...vis.views.values())]
        vis.colorScale.domain(vis.viewsDomain)

        vis.countries.transition().duration(750).attr('fill', d => getColor(vis, d))

        vis.selectedCountryData = vis.peopleByCountry.get(vis.selectedCountry) || [];
        setOptimalRadius(vis)
        renderPersonPoints(vis);
        vis.renderLegend();
    }

    /**
     * Render svg components with enter/update/exit pattern
     */
    renderVis() {
        let vis = this
        vis.container = d3.select(vis.config.parentElement).on("click", (event, d) => resetCountry(event, d, vis));

        //append svg to parent element
        vis.svg = vis.container
            .append('svg')
            .attr('width', vis.config.containerWidth)
            .attr('height', vis.config.containerHeight)

        //add Title to Map
        vis.description = d3.select(vis.config.parentElement).append('g')
        vis.description.append('text')
            .text("Place of Birth [Country/Region]")
            .attr('class', 'map-description')
            .attr('id', 'graph-title')
        vis.description.attr('transform', `translate(${vis.config.margin.left * 2}, ${vis.config.margin.top})`)

        //define the projection
        vis.projection = d3.geoMercator().scale(vis.mapZoom).translate(vis.mapTranslate)

        //define the geoPath using the projection
        vis.path = d3.geoPath(vis.projection)

        //append group vis.map to the svg
        vis.map = vis.svg.append('g')

        //Load the map data and render on vis.map
        d3.json(vis.mapPathsFile).then(
            data => {

                //Simplification of Map Geometry
                const presimplified = topojson.presimplify(data);

                // Set the simplification threshold
                const threshold = 0.6;

                // Simplify the TopoJSON
                const simplified = topojson.simplify(presimplified, threshold);
                const countries = topojson.feature(simplified, data.objects.countries)

                //Append country geometry to map
                vis.countries = vis.map.selectAll('path')
                    .data(countries.features)
                    .join('path')
                    .attr('class', d => 'country ' + getCountryName(d).replace(' ', '_'))
                    .attr('d', vis.path)
                    .attr('cursor', 'pointer')
                    .on('mouseover', function (event, d) {
                        hoverCountry(event, d, this, vis)
                    })
                    .on('mouseout', function (event, d) {
                        hoverOut(event, d, this, vis)
                    })
                    .on('click', function (event, d) {
                        vis.clickCountry(event, d, this, vis)
                    })

                //Add color to countries based on their view count
                vis.countries
                    .transition().duration(vis.duration)
                    .attr('fill', d => getColor(vis, d))
            })

    }

    // Handle dispatch data from the ScatterPlot to highlight the country is not zoomed, points if zoomed.
    dispatchHandle() {
        let vis = this;

        if (!vis.isZoomed) {
            d3.selectAll('.country')
                .classed('highlighted', d => {
                    if (getCountryName(d) === vis.highlightCountry) {
                        return true;
                    }
                    ;
                    return false;
                });
        } else {
            d3.selectAll('.person-point')
                .classed('highlighted', d => {
                    if ((d.id === vis.highlightID)) {
                        return true;
                    }
                })
                .classed('occupationHighlighted', d => {
                    if (d.occupation === vis.highlightedOccupation && vis.activeOccupation === '') {
                        return true;
                    }
                    return false;
                })
        }
    }

    /**
     * Update selection data, zoom in, calls dispatch to update global views
     */
    clickCountry(event, d, g, vis) {

        vis.resetOccupationSelection();

        const countryName = getCountryName(d)

        if (vis.selectedCountry === countryName) {
            //case where the country is being unselected
            resetCountry(event, d, vis)

            return;
        } else if (vis.selectedCountry !== '') {
            //case where another country was selected before, reset selection before proceeding
            setDefault(vis.selectedCountryG)

        }
        vis.selectedCountry = countryName
        vis.selectedCountryG = g
        vis.selectedCountryPath = d;
        setSelected(g)
        clickZoomIn(event, d, vis)

        vis.dispatch.call('mapDispatch', null, vis.selectedCountry);
    }


    /**
     * Render legend components with enter/update/exit pattern
     */
    renderLegend() {
        const vis = this
        vis.legend = d3.select(vis.config.parentElement).append('g')
        const legendSize = 20;
        const colorObjects = []
        const legendLength = 8

        //Creat color objects based on the max views and the color scale
        for (let i = legendLength; i >= 0; i--) {
            const views = vis.viewsDomain[1] * i / legendLength
            colorObjects.push({views: views, color: vis.colorScale(views)})
        }

        colorObjects.forEach((item, index) => {
            // Add a colored rectangle for each category
            vis.legend.append("rect")
                .attr("x", 20)
                .attr("y", 20 + index * (legendSize + 5))
                .attr("width", legendSize)
                .attr("height", legendSize)
                .style("fill", item.color);

// Add a text label for each category
            vis.legend.append("text")
                .attr('id', 'legend-text')
                .attr("x", 20 + legendSize + 5)
                .attr("y", 20 + index * (legendSize + 5) + (legendSize / 2))
                .attr("dy", ".35em") // Center the text vertically
                .text(getLegendsText(item));
        });
        vis.legend.append("text")
            .attr('id', 'legend-text')
            .attr("x", 20)
            .attr("y", 0)
            .attr("dy", ".35em") // Center the text vertically
            .text('Million Views')

        //Placement of the legend relative to the map svg
        vis.legend.attr('transform', `translate(${vis.width * 0.83}, ${vis.height * 0.25})`)
    }

    // clear occupation selected for the current country
    resetOccupationSelection() {
        let vis = this;
        vis.highlightedOccupation = '';
        vis.activeOccupation = '';
    }
}

/**
 * Reset country selection data upon clicking selected countries/blank area, zoom out
 */
function resetCountry(event, d, vis) {
    vis.resetOccupationSelection();
    vis.isZoomed = false;
    vis.selectedCountry = ''
    vis.selectedCountryData = [];
    setDefault(vis.selectedCountryG);
    vis.dispatch.call('mapDispatch', null, vis.selectedCountry);
    vis.svg.transition().duration(vis.duration).call(
        vis.zoom.transform,
        d3.zoomIdentity,
        d3.zoomTransform(vis.svg.node()).invert([vis.width / 2, vis.height / 2])
    );
}

/**
 * zoom transformation component
 */
function zoomed(event, d, vis) {
    const {transform} = event;
    vis.map.attr("transform", transform);
    vis.map.attr("stroke-width", 1 / transform.k);
}

/**
 * calls zoom transformation upon clicking unselected countries
 */
function clickZoomIn(event, d, vis) {
    vis.isZoomed = true;
    const [[x0, y0], [x1, y1]] = vis.path.bounds(d);
    event.stopPropagation();
    vis.svg.transition().duration(vis.duration).call(
        vis.zoom.transform,
        d3.zoomIdentity
            .translate(vis.width / 2, vis.height / 2)
            .scale(Math.min(8, 0.9 / Math.max((x1 - x0) / vis.width, (y1 - y0) / vis.height)))
            .translate(-(x0 + x1) / 2, -(y0 + y1) / 2),
        d3.pointer(event, vis.svg.node())
    );
}

/**
 * sets person points' radius based on the zoomed-in display area of the countries
 */
function setOptimalRadius(vis) {
    const [[x0, y0], [x1, y1]] = vis.path.bounds(vis.selectedCountryPath);
    const width = x1 - x0, height = y1 - y0;
    const area = width * height
    let diff = Math.abs(width - height)
    if (diff > 30 && area > 15000) {
        // oversize countries
        vis.radius = 3.5
    } else if (area < 600 || vis.countriesWithLargeAreaButSmallDisplayArea.includes(vis.selectedCountry)) {
        // small countries
        vis.radius = 0.8
    } else {
        // default
        vis.radius = 1.2
    }
}

/**
 * render person points with selectedCountryData and with enter/update/exit pattern
 */
function renderPersonPoints(vis) {
    if (vis.selectedCountryData) {
        vis.personPoints = vis.map
            .selectAll('.person-point')
            .data(vis.selectedCountryData)
            .join("circle")
            .on("mouseover", function (event, d) {
                setPersonHovered(this)
                vis.showPersonTooltip(event, d, vis)
                hoverDispatcher(event, vis);
            }).on('mouseout', function (event, d) {
                setPersonDefault(this)
                vis.hideToolTip()
                hoverDispatcher(event, vis);
            })
            .attr('class', 'person-point')
            .attr('display', 'none')
            .classed('active', d => vis.selectedCountry === d.bplace_country)
            .attr('r', vis.radius + 'px')
            .transition()
            .duration(500)
            .attr('cx', d => calculateProjectedXPos(vis, d.bplace_lon, d.bplace_lat))
            .attr('cy', d => calculateProjectedYPos(vis, d.bplace_lon, d.bplace_lat))
    }
}

// Manage the information for hovering
function hoverDispatcher(event, vis) {
    const id = vis.map.selectAll('.person-point.hovered').data().map(d => d.id);
    const occupation = vis.map.selectAll('.person-point.hovered').data().map(d => d.occupation);
    const obj = {id: id[0], occupation: occupation[0]};
    vis.hoverdispatch.call('mapHoverDispatch', event, obj);
}

function hoverCountry(event, d, g, vis) {
    showCountryTooltip(event, d, vis)
    if (vis.selectedCountry !== getCountryName(d)) setHovered(g)
}


function hoverOut(event, d, g, vis) {
    vis.hideToolTip()
    if (vis.selectedCountry !== getCountryName(d)) setDefault(g)
}

function calculateProjectedXPos(vis, lon, lat) {
    return vis.projection([(lon), (lat)])[0]
}

function calculateProjectedYPos(vis, lon, lat) {
    return vis.projection([(lon), (lat)])[1]
}

function setHovered(g) {
    d3.select(g).attr('class', 'country hovered')
}

function setDefault(g) {
    d3.select(g).attr('class', 'country')
}

function setSelected(g) {
    d3.select(g).attr('class', 'country selected')
}

function getCountryName(d) {
    return (d.properties.name === 'United States of America') ? 'United States' : d.properties.name
}

function getColor(vis, d) {
    const views = vis.views.get(getCountryName(d))

    if (views === undefined) {
        return '#fff'
    } else {
        return vis.colorScale(views)
    }
}

function getLegendsText(item) {
    if (item.views === -Infinity || isNaN(item.views)) {
        return 'NaN'
    }
    return (item.views / 1000000).toFixed(1) + ' M';
}

function setPersonHovered(g) {
    d3.select(g).attr('class', 'person-point active hovered')
}

function setPersonDefault(g) {
    d3.select(g).attr('class', 'person-point active')
}


function showCountryTooltip(event, d, vis) {
    const countryName = getCountryName(d)
    const totalPageViews = vis.views.get(countryName) === undefined ? 0 : vis.views.get(countryName)
    const totalPageViewsMillion = (totalPageViews / 1000000).toFixed(2)

    //do not show country tooltip is that country is toggled, still showing neighbouring countries tooltip
    if (selectedCountry !== countryName) {
        d3.select('#tooltip')
            .style('display', 'block')
            .style('left', event.pageX + 10 + 'px')
            .style('top', event.pageY + 10 + 'px').html(`
          <div class="tooltip-title">${countryName}</div>
          <div><i>Total Page views: ${totalPageViewsMillion} Million</i></div>
        `)
    }
}
