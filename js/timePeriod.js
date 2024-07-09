
class TimePeriod {
    constructor(_data, _config,_dispatch) {
        this.historicalTimePeriods = _data
        this.config = {
            parentElement: _config.parentElement,
            containerWidth: _config.containerWidth || 1350,
            containerHeight: _config.containerHeight || 50,
            barHeight: _config.barHeight || 14,
            barPaddingInner: _config.barPaddingInner || -0.005,
            labelYPosition: _config.barYPosition || 0,
            labelXCenteringConstant: 45,
            barYPosition: _config.barYPosition || 7,
            edgeRadius: _config.edgeRadius || 5,
            tooltipPadding: _config.tooltipPadding || 5,
            margin: _config.margin || {top: 20, right: 35, bottom: 20, left: 25},
        }
        this.dispatch = _dispatch
        this.activePeriods = []
        this.initialActivePeriods = _data.slice(-2).map(o => o.Name)
        this.periodSequence = _data.map(o => o.Name)

        this.initVis()
    }

    /**
     * Initialize variables and scales
     */
    initVis() {
        let vis = this
        vis.width = vis.config.containerWidth - vis.config.margin.left - vis.config.margin.right;
        vis.height = vis.config.containerHeight - vis.config.margin.top - vis.config.margin.bottom;

        // access functions
        vis.timePeriodName = d => d.Name;
        vis.timePeriodStart = d => d.yearRange[0];
        vis.timePeriodEnd = d => d.yearRange[1];

        // scales
        vis.xScale = d3.scaleBand().domain(vis.historicalTimePeriods.map(vis.timePeriodName))
            .range([0, vis.width]).paddingInner(vis.config.barPaddingInner);

        // Define size of SVG drawing area
        vis.svg = d3.select(vis.config.parentElement)
            .attr('width', vis.config.containerWidth)
            .attr('height', vis.config.containerHeight);
        // SVG Group containing the actual chart; D3 margin convention
        vis.chart = vis.svg.append('g')
            .attr('transform', `translate(${vis.config.margin.left},${vis.config.margin.top})`);
    }

    /**
     * Update svg
     */
    updateVis() {
        let vis = this

        vis.renderVis();
    }

    /**
     * Render svg components based on data
     */
    renderVis() {
        let vis = this
        vis.bars = vis.chart.selectAll('.time-period-bar')
            .data(vis.historicalTimePeriods, vis.timePeriodName)
            .join('rect')
            .attr('class', 'time-period-bar')
            .attr('x', d => vis.xScale(vis.timePeriodName(d)))
            .attr('width', vis.xScale.bandwidth())
            .attr('height', vis.config.barHeight)
            .attr('y', vis.config.barYPosition)
            .attr('rx', vis.config.edgeRadius)
            .attr('ry', vis.config.edgeRadius)
            .on('click', function(event, d) {
                // Check if current category is active and toggle class
                const isActive = d3.select(this).classed('active');
                d3.select(this).classed('active', !isActive);

                if (isActive) {
                    vis.deleteTimePeriod(d.Name)
                } else {
                    vis.activePeriods.push(d.Name)
                }

                // Get the names of all active/filtered categories
                const selectedTimePeriods = vis.chart.selectAll('.time-period-bar.active').data().map(vis.timePeriodName);
                vis.chart.selectAll('.time-period-label').classed('active', d => selectedTimePeriods.includes(d.Name));

                vis.sortActivePeriods();
                vis.dispatch.call('timePeriodDispatch', null, vis.activePeriods)
            })

        const labels = vis.chart.selectAll('.time-period-label')
            .data(vis.historicalTimePeriods, vis.timePeriodName)
            .join('text')
            .attr('x', d => vis.xScale(vis.timePeriodName(d)) + vis.config.labelXCenteringConstant)
            .attr('y', vis.config.labelYPosition)
            .text(vis.timePeriodName)
            .attr('class', 'time-period-label')


        //add tooltips
        vis.bars.on('mouseover', (event, d) => {
            vis.showTooltip(event, d, vis)
        }).on('mouseleave', () => {
            vis.hideToolTip()
        })
    }

    // display tooltip when mouse event is triggered
    showTooltip(event, d, vis) {
        d3.select('#tooltip')
            .style('display', 'block')
            .style('left', event.pageX + vis.config.tooltipPadding + 'px')
            .style('top', event.pageY + vis.config.tooltipPadding + 'px').html(`
          <div class="tooltip-title">${d.Name}</div>
          <div><p>${d.yearRangeWrittenNotation}</p></div>
          <div class="historical-time-period-description"><i>${d.description}</i></div>
        `)
    }

    // hide tooltip when mouse event is triggered
    hideToolTip() {
        d3.select('#tooltip').style('display', 'none')
    }

    /**
     * Set svg element active based on initialActivePeriods, update views with dispatcher
     */
    setInitialActivePeriodsAndUpdateViews() {
        let vis = this;
        d3.selectAll('.time-period-bar').classed('active', d => vis.initialActivePeriods.includes(vis.timePeriodName(d)));
        vis.activePeriods = vis.initialActivePeriods
        vis.dispatch.call('timePeriodDispatch', null, vis.activePeriods)
    }

    deleteTimePeriod(periodName) {
        let vis = this;
        vis.activePeriods = vis.activePeriods.filter(period => period !== periodName);
    }

    sortActivePeriods() {
        let vis = this;
        vis.activePeriods.sort((a, b) => vis.periodSequence.indexOf(a) - vis.periodSequence.indexOf(b))
    }
}
