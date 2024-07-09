class Graph {

    /**
     * sort people grouped by countries of birth by page_views, slice the arrays to infoDensityIndex Length
     */
    reduceInfoDensityByCountry(vis){

        let peopleByCountry = d3.group(vis.data, d => d.bplace_country);
        peopleByCountry.forEach(function (value, key, map) {
                let peopleArr = map.get(key)
                if (peopleArr.length > 0, vis.config.infoDensityIndex) {
                    peopleArr.sort(d => d3.descending(d.non_en_page_views))
                    peopleArr = peopleArr.slice(0, vis.config.infoDensityIndex)
                    map.set(key, peopleArr);
                }
            }
        )
        return peopleByCountry;
    }


    /**
     * sort people data by page_views, slice the arrays to infoDensityIndex Length
     */
    reduceInfoDensity(vis){
        if (vis.data.length) {
            vis.data.sort((a, b) => d3.descending(a.non_en_page_views, b.non_en_page_views));
            vis.data = vis.data.slice(0, vis.config.infoDensityIndex);
        }
    }


    /**
     * display person's tooltip with relevant information in both scatterPlot and the Map View
     */
    showPersonTooltip(event, d, vis) {
        const birthRegionName = d.bplace_geacron_name !== '' ? d.bplace_geacron_name :d.bplace_country
        const name = d.name
        const birthPlace = d.bplace_name
        const occupation = d.occupation
        const pageViews = d.non_en_page_views
        const deathRegionName = d.dplace_geacron_name !== '' ? d.dplace_geacron_name :d.dplace_country
        const isAlive = d.alive === 'True';

        let deathPlaceName = d.dplace_name + ', ' + deathRegionName;
        if (deathRegionName === '' && d.dplace_name  === '') {
            deathPlaceName = 'Unknown'
        }

        d3.select('#tooltip')
            .style('display', 'block')
            .style('left', event.pageX + vis.tooltipPaddingX + 'px')
            .style('top', event.pageY + vis.tooltipPaddingY + 'px').html(`
      <div class="tooltip-title">${name}</div>
            <div class="tooltip-text">${d.birthyear}  &nbsp - &nbsp  ${isAlive ? '' : d.deathyear}</div>
      <div class="tooltip-text"><li>Birth Place: ${birthPlace}, ${birthRegionName}</li></div>
      <div class="tooltip-text"><li>Occupation: ${occupation}</li></div>
      <div class="tooltip-text"><li>Page views: ${pageViews}</li></div>
      <div class="tooltip-text"><li>Alive: ${isAlive}</li></div>
      ${!isAlive? `<div><li>Died in: ${deathPlaceName}</li></div>` : ''}
        `)
    }

    hideToolTip() {
        d3.select('#tooltip').style('display', 'none')
    }
}
