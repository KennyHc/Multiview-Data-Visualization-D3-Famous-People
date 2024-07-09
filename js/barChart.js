class BarChart extends Graph {
    constructor(_data, _config, _dispatch, _initialData, _country, _dispatch2) {
        super();
        this.config = {
            parentElement: _config.parentElement,
            containerWidth: 650,
            containerHeight: 380,
            margin: {top: 32, right: 65, bottom: 75, left: 55},
        }

        this.data = _data
        this.xDomain = []
        this.parsedData = []
        this.activeOccupation = ''
        this.highlightedOccupation = ''
        this.hoveredOccupation = ''
        this.occupations = new Set([]);
        this.defaultColor = '#7793bd'
        this.activeColor = '#587bb0'
        this.inactiveColor = '#D7E2E9'
        this.highlightColor = '#f5b35b'
        this.dispatch = _dispatch
        this.occupationDispatch = _dispatch2
        this.numberOfOccupations = 6
        this.selectedCountry = _country

        this.yDomain = [0, d3.max(this.parsedData, (d) => d.occupationCount)]
        this.hoverColor = 'black'


        this.title = 'Occupation'

        this.initVis()
    }

    /**
     * Create SVG area, initialize scales and axes
     */
    initVis() {

        let vis = this
        vis.container = d3.select(vis.config.parentElement)

        //append svg to parent element
        vis.svg = vis.container
            .attr('width', vis.config.containerWidth)
            .attr('height', vis.config.containerHeight)

        //append barchart g to svg
        vis.barchart = vis.svg
            .append('g')
            .attr(
                'transform',
                `translate(${vis.config.margin.left}, ${vis.config.margin.top})`
            )

        //Barchart title
        vis.title = vis.barchart
            .append('text')
            .text(vis.getTitle())
            .attr('x', 370)
            .attr('y', -10)
            .attr('id', 'graph-title')
            .style('text-anchor', 'middle')

        //Barchart Y-Axis Title
        vis.yaxisTitle = vis.barchart
            .append('text')
            .text("Count")
            .attr("id", "axis-label")
            .attr('x', -35)
            .attr('y', -10)

        vis.renderXAxis()
        vis.renderYAxis()
        vis.renderVis()

        vis.occupationInputOnChange()
    }

    /**
     * Update view data and render svg
     */
    updateVis() {
        let vis = this
        vis.parseData(vis.inputOccupation)
        vis.yDomain = [0, d3.max(this.parsedData, (d) => d.occupationCount)]
        vis.yScale.domain(vis.yDomain)
        vis.yAxisG.transition()
            .duration(500).call(vis.yAxis)
        vis.xScale.domain(vis.xDomain)
        vis.xAxisG.transition()
            .duration(500).call(vis.xAxis)

        vis.title.text(vis.getTitle())


        vis.renderVis()
        // Prepare data and scales
    }

    // XAxis scale initialization and rendering
    renderXAxis() {
        let vis = this

        //Define the x-scale
        vis.xScale = d3
            .scaleBand()
            .range([0, vis.config.containerWidth - vis.config.margin.right])
            .paddingInner(0.3)
            .paddingOuter(0.3)
            .domain(vis.xDomain)

        vis.xAxis = d3.axisBottom(vis.xScale)

        vis.xAxisG = vis.barchart
            .append('g')
            .attr('class', 'x_axis')
            .attr(
                'transform',
                `translate(0, ${vis.config.containerHeight - vis.config.margin.bottom})`
            )
            .call(vis.xAxis)
    }

    // YAxis scale initialization and rendering
    renderYAxis() {
        let vis = this
        vis.yScale = d3
            .scaleLinear()
            .domain(vis.yDomain)
            .range([vis.config.containerHeight - vis.config.margin.bottom, 0])

        vis.yAxis = d3
            .axisLeft(vis.yScale)
            .ticks(6)
            .tickSize([-vis.config.containerWidth + vis.config.margin.right])

        vis.yAxisG = vis.barchart
            .append('g')
            .attr('class', 'y_axis')
            .call(vis.yAxis)
    }

    /**
     * render svg components based on view data
     */
    renderVis() {
        //Bind data to visual elements, update axes
        let vis = this
        vis.svg.selectAll('.domain').remove()

        vis.bar = vis.barchart
            .selectAll('.bar')
            .data(vis.parsedData)
            .join('rect')
            .attr('class', 'bar')

        vis.bar
            .transition()
            .duration(400)
            .attr('x', (i) => vis.xScale(i.occupationName))
            .attr('y', (i) => vis.yScale(i.occupationCount))
            .attr('width', vis.xScale.bandwidth())
            .attr('height', (i) => {
                return (
                    vis.config.containerHeight -
                    vis.config.margin.bottom -
                    vis.yScale(i.occupationCount)
                )
            })
            .attr('fill', (d) => {
                if (d.occupationName === vis.highlightedOccupation && vis.activeOccupation === '') {
                    return vis.highlightColor;
                }
                return vis.getColor(d);
            })

        d3.selectAll('.bar')
            .style('stroke', d => {
                if (d.occupationName === vis.highlightedOccupation) {
                    return '#000';
                }
            })
            .attr('cursor', 'pointer');

        // Handle hover and clicks
        vis.bar
            .on('mouseenter', function (event, d) {
                vis.hoveredOccupation = d.occupationName;
                d3.select(this).style('stroke', vis.hoverColor)
                d3.select(event.currentTarget)
                    .classed('hovered', true)
                vis.handleOccupationDispatch(event)
            })
            .on('mouseleave', function (event, d) {
                vis.hoveredOccupation = '';
                d3.select(this).style('stroke', null)
                d3.select(event.currentTarget)
                    .classed('hovered', false)
                vis.handleOccupationDispatch(event);

            })
            .on('click', function (event, d) {
                if (vis.activeOccupation === '') {
                    vis.activeOccupation = d.occupationName
                    vis.input.value = vis.activeOccupation;
                } else if (vis.activeOccupation === d.occupationName) {
                    vis.activeOccupation = ''
                    vis.resetOccupationInput();
                } else {
                    vis.activeOccupation = d.occupationName
                    vis.inputOccupation = ''
                    vis.input.value = vis.activeOccupation;
                }


                vis.dispatch.call('barChartDispatch', null, {
                    activeOccupation: vis.activeOccupation
                })

                vis.updateVis()
            })

        vis.barLabel = vis.barchart.selectAll(".bar-label")
            .data(vis.parsedData)
            .join('text')
            .attr('class', 'bar-label')
            .transition()
            .duration(400)
            .attr('x', (i) => vis.xScale(i.occupationName) + vis.xScale.bandwidth()/3 - i.occupationCount.toString().length)
            .attr('y', (i) => vis.yScale(i.occupationCount) - 5)
            .attr('width', vis.xScale.bandwidth())
            .text(d => d.occupationCount)
    }

    // Send the occupation to main when the points are hovered
    handleOccupationDispatch() {
        let vis = this;
        if (vis.activeOccupation === '') {
            vis.occupationDispatch.call('occupationHoverDispatch', null, vis.hoveredOccupation);
        }
    }

    /**
     * Parse barchart data to group and sort based on occupation and occupationCount, select the top items based on input
     */
    parseData(inputOccupation) {
        let vis = this
        let result = []

        const group = d3.group(vis.data, (d) => d.occupation)

        group.forEach((value, key) => {
            result.push({occupationName: key, occupationCount: value.length})
        })

        result.sort((a, b) => b.occupationCount - a.occupationCount)

        vis.occupations = new Set(result.map((d) => d.occupationName));
        vis.setOccupationDataList();

        let additionalBar = inputOccupation ? result.find(o => o.occupationName === inputOccupation) : undefined
        result = result.slice(0, vis.numberOfOccupations)
        if (additionalBar) {
            result.push(additionalBar)
        }


        vis.xDomain = result.map((d) => d.occupationName)


        vis.parsedData = result

    }

    // returns color information for marks based on occupation selection
    getColor(d) {
        let vis = this

        if (vis.activeOccupation === '') {
            return vis.defaultColor
        } else if (vis.activeOccupation === d.occupationName) {
            return vis.activeColor
        } else {
            return vis.inactiveColor
        }
    }

    // returns the title text for barchart
    getTitle() {
        let vis = this
        if (vis.selectedCountry === '') {
            return 'Top Occupations Worldwide'
        } else if (vis.selectedCountry === 'United States') {
            return 'Top Occupations in the ' + vis.selectedCountry
        } else {
            return 'Top Occupations in ' + vis.selectedCountry
        }
    }

    // reset occupation selection when country selected changes
    resetOccupationSelection() {
        let vis = this;
        vis.activeOccupation = '';
        vis.highlightedOccupation = '';
        vis.resetOccupationInput()
    }

    // set input datalist drop down options based on data updates
    setOccupationDataList() {
        let vis = this;
        let dataList = document.getElementById('occupation-datalist');
        while (dataList.firstChild) {
            dataList.removeChild(dataList.firstChild);
        }
        vis.occupations.forEach(function (occupation) {
            // Create a new <option> element.
            var option = document.createElement('option');
            // Set the value using the item in the JSON array.
            option.value = occupation;
            // Add the <option> element to the <datalist>.
            dataList.appendChild(option);
        });
    }

    // add listener for input changes
    occupationInputOnChange() {
        let vis = this;
        vis.input = document.getElementById('datalist-value');
        vis.input.addEventListener('change', (e) => {
            vis.inputOccupation = e.target.value;
            if (!vis.occupations.has(vis.inputOccupation)) {
                e.target.value = '';
            }
            if (vis.inputOccupation !== undefined && vis.inputOccupation !== '') {
                vis.dispatch.call('barChartDispatch', null, {
                    activeOccupation: vis.inputOccupation
                })
            }
            vis.activeOccupation = vis.inputOccupation
            vis.updateVis();
        })
    }

    resetOccupationInput() {
        let vis = this;
        vis.input.value = '';
        vis.inputOccupation = '';
    }
}
