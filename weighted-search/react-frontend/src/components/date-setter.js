/*Wrapping component for Start and End date
 *Selectors
 *
 */

import React, { Component } from 'react';


import DateSelector from './date-selector'


class DateSetter extends Component {
    render (){
        return( 
            <div className="DateSetter">
                <DateSelector
                    selector = "Start Date"
                    setDate = {this.props.setDate}
                    date = {this.props.daterange[0]}
                />
                
                <DateSelector
                    selector = "End Date"
                    setDate = {this.props.setDate}
                    date = {this.props.daterange[1]}
                />
            </div>
        );
    }
}





export default DateSetter
