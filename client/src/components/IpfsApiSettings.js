'use strict';

import React from 'react';
import ListForm from "components/generics/ListForm";

class IpfsApiSettings extends React.Component {

    constructor(props) {
      super(props);
      this.onElementChange = this.onElementChange.bind(this);
    }

    onElementChange(value, name) {
      const legacyHeaders = this.props.API ? this.props.API.HTTPHeaders : {}
      let HTTPHeaders = Object.assign({}, legacyHeaders)
      HTTPHeaders[name] = value
      console.log(name, value)
      const newApi = {HTTPHeaders: HTTPHeaders}
      this.props.onChange(newApi, 'API')
    }

    render() {
      const API = this.props.API
      console.log(API)
      let HTTPHeaders = API && API.HTTPHeaders ? API.HTTPHeaders : {}
      let origin = HTTPHeaders['Access-Control-Allow-Origin']
      origin = origin ? origin : []
      let methods = HTTPHeaders['Access-Control-Allow-Methods']
      methods = methods ? methods : []
      let credentials = HTTPHeaders['Access-Control-Allow-Credentials']
      credentials = credentials ? credentials : []
      return (
        <div>
          <div>
            <ListForm name="Access-Control-Allow-Origin"
                      label="Access-Control-Allow-Origin"
                      list={origin}
                      onListChange={this.onElementChange}
            />
          </div>
          <div>
            <ListForm name="Access-Control-Allow-Credentials"
                      label="Access-Control-Allow-Credentials"
                      list={credentials}
                      onListChange={this.onElementChange}
            />
          </div>
          <div>
            <ListForm name="Access-Control-Allow-Methods"
                      label="Access-Control-Allow-Methods"
                      list={methods}
                      onListChange={this.onElementChange}
            />
          </div>
        </div>
      )
    }
}

export default IpfsApiSettings;
