
let data, map, timePeriod, barChart, scatterPlot

let historicalTimePeriods, periodNameArr;

let mapDispatch = d3.dispatch('mapDispatch')

let barChartDispatch = d3.dispatch('barChartDispatch')

let timePeriodDispatch =  d3.dispatch('timePeriodDispatch')

let scatterplotHoverDispatch = d3.dispatch('scatterplotHoverDispatch')

let mapHoverDispatch = d3.dispatch('mapHoverDispatch')

let occupationDispatch = d3.dispatch('occupationHoverDispatch')

let selectedCountry = ''
let activeOccupation = ''
let activePeriods = []

// controls number of marks on scatter-plot and zoomed-in map, showing top x marks sorted by page views
const infoDensityIndex = 20

// Load data and initialize the graphs
d3.csv('data/person_2020_update.csv').then((_data) => {
  data = _data
  // Remove person with NaN value of non_en_page_views, bplace country, and birthyear
  data = data.filter((d) => d.non_en_page_views !== "" && d.bplace_country !== "" && d.birthyear !== "");

  // Change numeric value from string
  data.forEach((d) => {
    d.id = +d.id
    d.birthyear = +d.birthyear
    d.deathyear = +d.deathyear
    d.hpi = +d.hpi
    d.non_en_page_views = +d.non_en_page_views;
    d.bplace_lat = +d.bplace_lat
    d.bplace_lon = +d.bplace_lon
    d.occupation = toTitleCase(d.occupation)
    d.alive = toTitleCase(d.alive)
  })

  /**
   * Filter original dataset based on page view data and hpi (Historical popularity index - doi: 10.1038/sdata.2015.75)
   */
  let filterFunction = (d) => (d.non_en_page_views > 100000 || d.hpi > 65)
  data = data.filter(filterFunction)

  // initialize views
  map = new MapGraph(data, {
    parentElement: '#map-graph',
    infoDensityIndex: infoDensityIndex
  }, mapDispatch, mapHoverDispatch)

  barChart = new BarChart(
      data,
      {parentElement: '#bar-chart'},
      barChartDispatch,
      data,
      selectedCountry,
      occupationDispatch
  )

  scatterPlot = new ScatterPlot(data,
      {
        parentElement: '#scatter-plot',
        infoDensityIndex: infoDensityIndex
      }, selectedCountry, activeOccupation, scatterplotHoverDispatch);


  // initialize timePeriod and set display values based on initial time periods selection
  d3.json('data/historical_time_periods.json').then((data) => {
        historicalTimePeriods = data;
        periodNameArr = historicalTimePeriods.map(o => o["Name"]);
        timePeriod = new TimePeriod(historicalTimePeriods, {parentElement: '#time-periods'}, timePeriodDispatch);
        timePeriod.updateVis();
        timePeriod.setInitialActivePeriodsAndUpdateViews();
      }
  )

  // on successful data loading, set loading circle invisible and set display contents visible
  finishLoadingSetContentVisible();
});


// Dispatchers

// Dispatcher handler for hovering the bar in bargraph (bar -> Scatterplot && Map);
occupationDispatch.on('occupationHoverDispatch', (event) => {
  if(event === undefined){
    event = ''
  }
  scatterPlot.highlightedOccupation = event
  scatterPlot.handleDispatch()
  map.highlightedOccupation = event
  map.dispatchHandle()
});

// Dispatcher handler for hovering the point in Scatterplot (Scatterplot -> bar && map) 
scatterplotHoverDispatch.on('scatterplotHoverDispatch', (event) => {
  if(event.country === undefined){
    event.country = "";
  }
  if(event.id === undefined){
    event.id = '';
  }
  if(event.occupation === undefined){
    event.occupation = '';
  }
  barChart.highlightedOccupation = event.occupation;
  updateBarChart();
  map.highlightCountry = event.country;
  map.highlightID = event.id;
  map.dispatchHandle();
});

// Dispatcher handler for country selection (map -> bar && Scatterplot)
mapDispatch.on('mapDispatch', (eventData) => {
  selectedCountry = eventData

  //remove occupation selection for BarChart and ScatterPlot when country reselected
  activeOccupation = ''
  barChart.resetOccupationSelection();

  updateBarChart()
  updateScatterPlot()
  updateMap()
});

// Dispatcher handler for hovering person points on map (map -> bar && Scatterplot)
mapHoverDispatch.on('mapHoverDispatch', (event) => {
  if(event.id === undefined){
    event.id = '';
  }
  if(event.occupation === undefined){
    event.occupation = '';
  }
  barChart.highlightedOccupation = event.occupation;
  updateBarChart();
  scatterPlot.highlightedID = event.id;
  scatterPlot.handleDispatch();
})

// Dispatcher handler for selecting occupation in barchart view (bar -> map && Scatterplot)
barChartDispatch.on('barChartDispatch', (event) => {
  activeOccupation = event.activeOccupation;
  scatterPlot.activeOccupation = activeOccupation;
  map.activeOccupation = activeOccupation;

  updateScatterPlot()
  updateMap()
});

// Dispatcher handler for selecting time periods  (timePeriod -> bar && map && Scatterplot)
timePeriodDispatch.on('timePeriodDispatch', (event) => {
  activePeriods = event

  //reset occupation selection for all views
  activeOccupation = ''
  barChart.resetOccupationSelection()
  map.resetOccupationSelection();
  scatterPlot.resetOccupationSelection();

  scatterPlot.setTimePeriods(activePeriods);

  updateBarChart()
  updateScatterPlot()
  updateMap()
});

// Update barChart view based on data updates from dispatchers
function updateBarChart () {
  barChart.selectedCountry = selectedCountry
  if (selectedCountry === '') {
    barChart.data = data
  }else {
    barChart.data = data.filter(d=>d.bplace_country === selectedCountry)
  }
  barChart.data = barChart.data.filter(d=> isWithinSelectedPeriods(d))
  barChart.updateVis()
}

// Update scatterPlot view based on data updates from dispatchers
function updateScatterPlot () {
  scatterPlot.selectedCountry = selectedCountry
  scatterPlot.activeOccupation = activeOccupation

  const noSelectedCountry = selectedCountry === ''
  const noActiveOccupation = activeOccupation === ''

  if ( noSelectedCountry&& noActiveOccupation ) {
    scatterPlot.data = data
  } else if (noActiveOccupation){
    scatterPlot.data = data.filter(d=>d.bplace_country === selectedCountry)
  } else if (noSelectedCountry) {
    scatterPlot.data = data.filter(d=>d.occupation === activeOccupation)
  } else {
    scatterPlot.data = data.filter(d=>d.occupation === activeOccupation && d.bplace_country === selectedCountry)
  }

  scatterPlot.data = scatterPlot.data.filter(d=> isWithinSelectedPeriods(d))
  scatterPlot.updateVis()
}

// Update map view based on data updates from dispatchers
function updateMap() {
  const noActiveOccupation =activeOccupation === ''
  map.data = data.filter(isWithinSelectedPeriods)
  if (!noActiveOccupation) {
    map.data = map.data.filter(d=>d.occupation === activeOccupation)
  }
  map.updateVis()
}


// returns true if the person is born within selected year range
function isInYearRange (y,yearRange){
  return y <= yearRange[1] && y >= yearRange[0]
}

// returns true if the person is born within selected periods
function isWithinSelectedPeriods(d) {
  const birthyear = d.birthyear
  let display = false

  if (activePeriods.length === 0) return false;

  for(let i = 0; i < periodNameArr.length; i++) {
    if(activePeriods.includes(periodNameArr[i])) {
      display = display || isInYearRange(birthyear, historicalTimePeriods.find(o => o["Name"] == periodNameArr[i]).yearRange);
    }
  }
  return display
}

function toTitleCase(str) {
  return str.toLowerCase().replace(/\b\w/g, function (match) {
    return match.toUpperCase();
  });
}

// set loadingItem invisible and set containers visible
function finishLoadingSetContentVisible() {
  let loadingItem = document.getElementsByClassName("lds-ring")[0];
  loadingItem.style.display = 'none';
  let containers = document.getElementsByClassName("container");
  for (let i = 0; i < containers.length; i++) {
    containers[i].style.display = 'block';
  }
}
