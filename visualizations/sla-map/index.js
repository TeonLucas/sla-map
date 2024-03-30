import React from 'react';
import PropTypes from 'prop-types';
import {WorldMap} from 'react-svg-worldmap';
import {Card, CardBody, HeadingText, NrqlQuery, Spinner} from 'nr1';

export default class SlaMapVisualization extends React.Component {
    // UI configration, corresponding to nr1.json
    static propTypes = {
        /**
         * A title for the chart
         */
        title: PropTypes.string,
        /**
         * An accountId, and array of objects consisting of a NRQL queries
         * These will be run and combined for the final percentage.
         */
        accountId: PropTypes.number,
        nrqlQueries: PropTypes.arrayOf(
            PropTypes.shape({
                query: PropTypes.string,
            })
        ),
        /**
         * The method to combine query results
         */
        combineMethod: PropTypes.string,
        /**
         * Number of decimal places to round combined results
         */
        decimalPlaces: PropTypes.number,
        /**
         * A threshold for the warning color
         */
        warning: PropTypes.number,
        /**
         * A threshold for the critical color
         */
        critical: PropTypes.number
    };

    constructor(props) {
        super(props);
        this.state = {
            results: [],
            error: undefined
        };
    }

    componentDidMount() {
        // Run all queries
        this.getAllResults().then((results) => this.setState({results}))
            .catch((error) => {
                this.setState({error})
                console.log(error.stack);
            });
    }

    /**
     * Run the queries
     */
    getAllResults = async () => {
        const {accountId, nrqlQueries} = this.props;
        if (!nrqlQueries) {
            throw new Error('No queries defined');
        }
        if (!accountId) {
            throw new Error('No accountId selected');
        }

        let promiseArr = [];
        let i = 0;
        for (let query of nrqlQueries) {
            i++;
            if (!query.query) {
                throw new Error(`Query #${i} not defined`);
            }
            if (query.query.toLowerCase().includes('facet')) {
                promiseArr.push(NrqlQuery.query({accountId, query: query.query}));
            } else {
                throw new Error(`Query #${i} missing FACET clause`);
            }
        }
        let dataMap = {};
        await Promise.all(promiseArr).then((results) => {
            // go through results
            for (let result of results) {
                this.transformData(result.data, dataMap);
                //console.log('dataMap:', JSON.stringify(dataMap));
            }
        });
        return this.combineData(dataMap);
    }

    /**
     * Restructure the data for a non-time-series, facet-based NRQL query
     */
    transformData = (rawData, dataMap) => {
        for (let item of rawData) {
            // Only use the first data value since it's not time-series
            if(dataMap[item.metadata.name]) {
                dataMap[item.metadata.name].push(item.data[0].y);
            }
            else {
                dataMap[item.metadata.name] = [item.data[0].y];
            }
        }
    };

    /**
     * Combine results
     */
    combineData = (dataMap) => {
        let {combineMethod, decimalPlaces} = this.props;
        // Apply default values
        if (!combineMethod) {
            combineMethod = 'average';
        }
        if (!decimalPlaces) {
            decimalPlaces = 0;
        }
        // Combine each array of values
        let allResults = [];
        for (let country of Object.keys(dataMap)) {
            let total;
            if (combineMethod === 'average') {
                // Average the values
                total = 0;
                for (let value of dataMap[country]) {
                    total += value;
                }
                total = total/dataMap[country].length;
            } else {
                // Multiply the values
                total = 1;
                for (let value of dataMap[country]) {
                    total *= value/100;
                }
                total = total * 100;
            }
            allResults.push({country, value: total.toFixed(decimalPlaces)})
        }
        return allResults;
    };

    setColor = (context) => {
        const {warning, critical} = this.props;
        // brighter green for higher number
        let opacity = 0.1 + 0.9 * (context.countryValue - critical) / (100 - critical);
        let fill = context.color;
        let stroke = context.color;
        if (context.countryValue < critical) {
            fill = 'red';
            stroke = 'red';
            // brighter red for lower number
            opacity = 0.05 + 4 * (critical - context.countryValue) / critical;
            if (opacity > 1) {
                opacity = 1;
            }
        } else if (context.countryValue < warning) {
            fill = 'yellow';
            stroke = 'gold';
            // brighter yellow for lower number
            opacity = 0.1 + 0.9 * (warning - context.countryValue) / (warning - critical);
        }
        //console.log(context.country, opacity);
        return {
            fill: fill,
            fillOpacity: opacity,
            stroke: stroke,
            strokeWidth: 4,
            strokeOpacity: 0.1,
            cursor: "pointer"
        }
    }

    render() {
        const {accountId, nrqlQueries, title} = this.props;
        const {error, results} = this.state;
        const nrqlQueryAvailable =
            accountId &&
            nrqlQueries &&
            nrqlQueries[0] &&
            nrqlQueries[0].query;

        if (!nrqlQueryAvailable) {
           return <EmptyState />;
        }
        if (error) {
            console.log(error.stack);
            return <ErrorState message={error.message}/>;
        }
        if (results.length === 0) {
            return <Spinner/>;
        }
        //console.log('Results:', JSON.stringify(results));

        return (
            <WorldMap styleFunction={this.setColor} color="green" title={title} valueSuffix="%" size="xxl" data={results} />
        );
    }
}

const EmptyState = () => (
    <Card className="EmptyState">
        <CardBody className="EmptyState-cardBody">
            <HeadingText
                spacingType={[HeadingText.SPACING_TYPE.LARGE]}
                type={HeadingText.TYPE.HEADING_3}
            >
                Please provide an accountId and least one NRQL query with a FACET
            </HeadingText>
            <HeadingText
                spacingType={[HeadingText.SPACING_TYPE.MEDIUM]}
                type={HeadingText.TYPE.HEADING_4}
            >
                An example NRQL query you can try is:
            </HeadingText>
            <code>
                SELECT count(*)*1.5 FROM SystemSample FACET cases(WHERE true AS 'us')
            </code>
        </CardBody>
    </Card>
);

const ErrorState = (props) => (
    <Card className="ErrorState">
        <CardBody className="ErrorState-cardBody">
            <HeadingText
                className="ErrorState-headingText"
                spacingType={[HeadingText.SPACING_TYPE.LARGE]}
                type={HeadingText.TYPE.HEADING_3}
            >
                Oops! Something went wrong<br/>
                {props.message}
            </HeadingText>
        </CardBody>
    </Card>
);
