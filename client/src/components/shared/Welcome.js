import React, { Component } from 'react';

export default class Welcome extends Component {
  state = {
  }

  render() {
    return (
        <section className="section">
        <div className="container">
          <h1 className="title">Knowledge Monitoring Dashboard/Quizzes</h1>
          <h2 className="subtitle">Under Development</h2>
          <div className="content">
            <ul>
                <li>See <a href="https://bulma.io/documentation/">Bulma Documentation</a> for styling information</li>
                <li>Choose Instructors or Students in the navbar above</li>
            </ul>
          </div>
        </div>
      </section>
    )
  }

}