class ScatterPlot extends Graph {
    constructor(_data, _config, _country, _occupation, _dispatch) {
        super();
        this.data = _data
        this.config = {
            parentElement: _config.parentElement,
            containerWidth: 650,
            containerHeight: 380,
            infoDensityIndex: _config.infoDensityIndex,
            margin: {top: 28, right: 55, bottom: 95, left: 65},
        }

        this.tooltipPaddingX = -300
        this.tooltipPaddingY = -170
        this.opacity = 1
        this.radius = 8


        this.dispatcher = _dispatch

        this.highlightedID = ''
        this.highlightedOccupation = '';

        this.activeTimePeriods = [];

        this.selectedCountry = _country
        this.activeOccupation = _occupation
        this.initVis()
    }

    /**
     * Initialize variables and render data independent svg
     */
    initVis() {
        let vis = this

        vis.width =
            vis.config.containerWidth -
            vis.config.margin.right -
            vis.config.margin.left
        vis.height =
            vis.config.containerHeight -
            vis.config.margin.top -
            vis.config.margin.bottom

        // Initialize SVG
        vis.svg = d3
            .select(vis.config.parentElement)
            .attr('width', vis.config.containerWidth)
            .attr('height', vis.config.containerHeight)

        vis.scatterPlot = vis.svg
            .append('g')
            .attr(
                'transform',
                `translate(${vis.config.margin.left}, ${vis.config.margin.top})`
            )

        vis.title = vis.scatterPlot
            .append('text')
            .text(vis.getTitle())
            .attr('id', 'graph-title')
            .attr('x', 350)
            .attr('y', -15)
            .style('text-anchor', 'middle')
        vis.timePeriodTitle = vis.scatterPlot
            .append('text')
            .text(vis.displayTimePeriods())
            .attr('id', 'graph-sub-title')
            .attr('x', 350)
            .attr('y', 10)
            .style('text-anchor', 'middle')

        vis.xaxisTitle = vis.scatterPlot
            .append('text')
            .text("Birth-year")
            .attr("id", "axis-label")
            .attr('x', -55)
            .attr('y', vis.height + vis.config.margin.bottom - 25)

        //reduce information density
        vis.reduceInfoDensity(vis)

        vis.renderXAxis()
        vis.renderYAxis()
        vis.renderVis()
    }

    // XAxis scale initialization and rendering
    renderXAxis() {
        let vis = this;

        vis.xScale = d3
            .scaleLinear()
            .range([50, vis.width])
            .domain(d3.extent(vis.data, (d) => d.birthyear))

        vis.xAxis = d3.axisBottom(vis.xScale).ticks(6)

        vis.xAxisG = vis.scatterPlot
            .append('g')
            .attr('class', 'x_axis')
            .attr(
                'transform',
                `translate(0, ${
                    vis.config.containerHeight - vis.config.margin.bottom + 10
                })`
            )
            .call(vis.xAxis)
    }

    // YAxis scale initialization and rendering
    renderYAxis() {
        let vis = this;

        vis.yScale = d3
            .scaleLinear()
            .range([vis.height, 0])
            .domain(d3.extent(vis.data, (d) => d.non_en_page_views))

        vis.yAxis = d3.axisLeft(vis.yScale)
            .tickSize([-vis.config.containerWidth + vis.config.margin.right])
            .tickFormat(d => ((d / 1000000).toFixed(2) + ' M'));

        vis.yAxisG = vis.scatterPlot
            .append('g')
            .attr('class', 'y_axis')
            .call(vis.yAxis)
            .attr('transform', `translate(0, ${vis.config.margin.top})`)
    }

    /**
     * Update corresponding data based on view updates, rerender svg components
     */
    updateVis() {
        let vis = this;

        //reduce information density
        vis.reduceInfoDensity(vis)

        vis.yScale.domain(d3.extent(vis.data, (d) => d.non_en_page_views))
        vis.yAxisG.transition()
            .duration(500).call(vis.yAxis)

        vis.xScale.domain(d3.extent(vis.data, (d) => d.birthyear))
        vis.xAxisG.transition()
            .duration(500).call(vis.xAxis)

        vis.title.text(vis.getTitle());
        vis.timePeriodTitle.text(vis.displayTimePeriods());

        vis.renderVis();
    }

    /**
     * Render svg components with enter/update/exit pattern
     */
    renderVis() {
        let vis = this;
        //Show top 100 if the data length > 100

        vis.xValue = (d) => d.birthyear
        vis.yValue = (d) => d.non_en_page_views

        //vis.svg.selectAll('circle').remove()

        const circles = vis.scatterPlot
            .selectAll('.point')
            .data(vis.data)
            .join('circle')

        circles.attr('r', vis.radius)
            .transition()
            .duration(500)
            .attr('opacity', vis.opacity)
            .attr('class', 'point')
            .attr('cy', (d) => vis.yScale(vis.yValue(d)))
            .attr('cx', (d) => vis.xScale(vis.xValue(d)))
            .attr('transform', `translate(0, ${vis.config.margin.top})`)

        circles
            .on('mouseover', (event, d) => {
                vis.showPersonTooltip(event, d, vis);
                d3.select(event.currentTarget)
                    .classed('highlighted', true)
                    .style('stroke-width', 2);
                vis.highlightDispatcher(event);
            })
            .on('mouseleave', (event, d) => {
                vis.hideToolTip();
                d3.select(event.currentTarget)
                    .classed('highlighted', false);
                vis.highlightDispatcher(event);
            })
            .on('click', (event, d) => {
                vis.openWikiPage(d.slug)
            })

        //vis.updateVis()
    }

    /**
     * Calls dispatch to other views to trigger highlight events on other views
     */
    highlightDispatcher(event) {
        let vis = this;
        const occupation = vis.scatterPlot.selectAll('.point.highlighted').data().map(d => d.occupation);
        const id = vis.scatterPlot.selectAll('.point.highlighted').data().map(d => d.id);
        const country = vis.scatterPlot.selectAll('.point.highlighted').data().map(d => d.bplace_country);
        const obj = {
            id: id[0],
            occupation: occupation[0],
            country: country[0]
        };
        vis.dispatcher.call('scatterplotHoverDispatch', event, obj);
    }


    /**
     * Highlight corresponding svg based on dispatch
     */
    handleDispatch() {
        let vis = this;
        d3.selectAll('.point')
            .classed('highlighted', d => {
                return d.id === vis.highlightedID;
            })
            .classed('occupationHighlighted', d => {
                return (d.occupation === vis.highlightedOccupation) && (vis.occupation === '');

            })
    }

    /**
     * Get scatter plot title text
     */
    getTitle() {
        let vis = this
        if (vis.activeOccupation === '') {
            if (vis.selectedCountry === '') {
                return 'Wikipedia View Counts Worldwide'
            } else if (vis.selectedCountry === 'United States') {
                return 'Wikipedia View Counts in the ' + vis.selectedCountry
            } else {
                return 'Wikipedia View Counts in ' + vis.selectedCountry
            }
        } else {
            if (vis.selectedCountry === '') {
                return 'Wikipedia View Counts for ' + vis.activeOccupation + 's'
            } else if (vis.selectedCountry === 'United States') {
                return 'Wikipedia View Counts for ' + vis.activeOccupation + 's in the ' + vis.selectedCountry
            } else {
                return 'Wikipedia View Counts for ' + vis.activeOccupation + 's in ' + vis.selectedCountry
            }
        }

    }

    // reset occupation selection when country selected changes
    resetOccupationSelection() {
        let vis = this;
        vis.activeOccupation = '';
        vis.highlightedOccupation = '';
    }

    /**
     * return text display of current selected time periods
     */
    displayTimePeriods() {
        let vis = this
        if(vis.activeTimePeriods.length > 1) {
            return '[' + vis.activeTimePeriods[0] + ' - ' +   vis.activeTimePeriods.at(-1) + ']'
        } else if(vis.activeTimePeriods.length === 1) {
            return '[' + vis.activeTimePeriods[0] + ']'
        } else {
            return '';
        }
    }

    setTimePeriods(activeTimePeriods) {
        let vis = this;
        vis.activeTimePeriods = activeTimePeriods
    }

    /**
     * Open corresponding wikipedia page if viewing from Desktop
     */
    openWikiPage(slug) {
        if(!/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)) {
            window.open("https://en.wikipedia.org/wiki/" + slug)
        }
    }
}
