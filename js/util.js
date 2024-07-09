const groupBy = (group) => d3.group(data, (d) => d[group])

const sortByCount = (array) =>
  array.sort((a, b) => Object.values(b)[1].length - Object.values(a)[1].length)

const isAlive = (d) => {
  return d.alive === 'TRUE'
}

//true if born after year
const isBornAfterYear = (d, year) => {
  return +d.birthyear >= year
}

//true if dead after year
const isDeadAfterYear = (d, year) => {
  if (d.deathyear == '') {
    return false
  } else {
    return +d.deathyear >= year
  }
}

//true if dead year is unknown
const hasNoDeathYear = (d) => {
  return d.deathyear == ''
}

const isFromCountry = (d, country) => {
  return d.bplace_country == country
}

const lGreaterThan = (d, number) => d.l >= number

const pageviewGreaterThan = (d, number) => d.non_en_page_views >= number

const filterData = (_data, year) => {
  return _data.filter((d) => {
    return (
      ((isAlive(d) && isBornAfterYear(d, year)) || isDeadAfterYear(d, year)) &&
      isFromCountry(d, 'United States') &&
      //lGreaterThan(d, 50) &&
      pageviewGreaterThan(d, 5000000)
    )
  })
}


export {
  groupBy,
  sortByCount,
  isAlive,
  isBornAfterYear,
  isDeadAfterYear,
  hasNoDeathYear,
  isFromCountry,
  lGreaterThan,
  pageviewGreaterThan,
  filterData,
}
