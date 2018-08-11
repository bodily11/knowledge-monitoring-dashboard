import React, { Component } from 'react';
import { Link } from 'react-router-dom';
import { graphql, compose } from 'react-apollo';
import gql from 'graphql-tag';

import { withAuthCheck } from '../shared/AuthCheck';

import ErrorBox from '../shared/ErrorBox';
import LoadingBox from '../shared/LoadingBox';
import SurveyView from '../shared/SurveyView';
import Modal from '../shared/Modal';

class SurveyEditor extends Component {
    constructor(props) {
        super(props);

        this.state = {
            surveyLoaded: false,
            newSurveyText: '',
            isSaving: false,
            formatModalVisible: false
        };
    }

    // This is kind of a react anti-pattern to seed state from props, but without a proper callback for when the apollo query finishes loading, it's the easiest way.
    componentWillReceiveProps(nextProps) {
        if (!nextProps.courseQuery.loading && !this.state.surveyLoaded) {
            this.setState({
                newSurveyText: this._stringifySurvey(nextProps.courseQuery.course.survey),
                surveyLoaded: true
            });
        }
    }

    // If navigating away from this component and back to it, apollo won't reload the query, but automatically populate the courseQuery prop. So handle that case on component mount.
    componentDidMount() {
        // If the
        if (!this.state.surveyLoaded && this.props.courseQuery && !this.props.courseQuery.loading && this.props.courseQuery.course.survey) {
            this.setState({
                newSurveyText: this._stringifySurvey(this.props.courseQuery.course.survey),
                surveyLoaded: true
            });
        }
    }

    /* Structure of survey object:
       survey = {
           questions: [
               {
                    index: 0,
                    prompt: "What is your favorite color?",
                    options: [
                        {index: 0, text: "Red"},
                        {index: 1, text: "Blue"},
                        {index: 2, text: "Orange"},
                        {index: 3, text: "Green"},
                    ]
                },
               {
                    index: 1,
                    prompt: "What is your favorite fruit?",
                    options: [
                        {index: 0, text: "Redberry"},
                        {index: 1, text: "Blueberry"},
                        {index: 2, text: "Orange"},
                        {index: 3, text: "Greenleaf"},
                    ]
                }
           ]
       }
    */

    // Parses the survey text into an array of questions objects containing prompt and options
    _parseSurveyText(text) {
        // Add an extra new line at the end so that last question gets popped off
        text += '\n';
        let lines = text.split('\n');
        let questions = [];
        let newQuestion = { options: [] }
        for (var i = 0; i < lines.length; i++) {
            let line = lines[i].trim();
            if (line === '' && newQuestion.prompt) {
                questions.push(newQuestion);
                newQuestion = { options: [] };
            } else if (!newQuestion.prompt) {
                newQuestion.prompt = line;
                newQuestion.index = questions.length + 1;
            } else if (line !== '') {
                newQuestion.options.push({ index: newQuestion.options.length + 1, text: line});
            }
        }
        //console.log(questions);
        return { questions };
    }

    // Stringifies a survey object into the user-editable text
    _stringifySurvey(survey) {
        if (!survey) { return ''; }
        let text = '';
        try {
            survey.questions.forEach(question => {
                text += question.prompt + '\n';
                text += question.options.map(opt => opt.text).join('\n');
                text += '\n\n';
            });
        } catch (error) {
            alert('Error parsing survey')
        }
        return text.trim();
    }

    async _saveSurvey() {
        this.setState({ isSaving: true });
        try {
            await this.props.saveSurveyMutation({
                variables: {
                    courseId: this.props.courseQuery.course.id,
                    survey: this._parseSurveyText(this.state.newSurveyText)
                }
            });
        } catch (error) {
            alert('There was an error saving the survey. Please copy the text somewhere safe and try again later.');
        }
        this.setState({ isSaving: false });
    }

    render() {

        if (this.props.courseQuery && this.props.courseQuery.loading) {
            return <LoadingBox />;
        }

        if (this.props.courseQuery && this.props.courseQuery.error) {
            return <ErrorBox><p>Couldn’t load course survey</p></ErrorBox>;
        }

        let course = this.props.courseQuery.course;

        return (
            <section className="section">
                <div className="container">

                    <nav className="breadcrumb" aria-label="breadcrumbs">
                        <ul>
                            <li><Link to="/instructor/courses">Course List</Link></li>
                            <li><Link to={"/instructor/course/" + course.id}>{course.title}</Link></li>
                            <li className="is-active"><Link to={"/instructor/survey/edit/" + course.id} aria-current="page">Edit Course Survey</Link></li>
                        </ul>
                    </nav>

                    <h3 className="title is-3">Course Survey</h3>
                    <i className="">Note: modifying the survey (except for adding new questions to the very end) after students have taken it will invalidate existing student responses.</i>
                    <br /><br />

                    <div className="columns">
                        <div className="column is-6">
                            <h4 className="subtitle is-4">
                                Editor
                                <button style={{height:"inherit", padding:"0"}} className="button is-text is-pulled-right" onClick={() => this.setState({ formatModalVisible: true })}>
                                    <span className="icon is-small"><i className="fas fa-question-circle"></i></span>
                                    <span>Formatting hints</span>
                                </button>
                            </h4>

                            <textarea className="textarea is-medium survey-editor" rows={10}
                                value={this.state.newSurveyText}
                                onChange={(e) => this.setState({ newSurveyText: e.target.value })} />
                        </div>
                        <div className="column is-6">
                            <h4 className="subtitle is-4">Preview</h4>

                            <SurveyView survey={this._parseSurveyText(this.state.newSurveyText)} />
                        </div>
                    </div>

                    <br /> <br />
                    <div className="field is-grouped">
                        <p className="control">
                            <Link className="button" to={"/instructor/course/" + course.id}>Cancel</Link>
                        </p>
                        <p className="control">
                            <button
                                className={"button is-link" + (this.state.isSaving ? " is-loading" : "")}
                                onClick={() => this._saveSurvey()}>
                                Save Survey
                            </button>
                        </p>
                    </div>

                    {this.state.formatModalVisible &&
                        <Modal modalState={true} closeModal={() => this.setState({ formatModalVisible: false })} title="Survey Formatting" showFooter={true}>
                            <ol>
                                <li>Type a question on one line.</li>
                                <li>Put each option for that question on a new line.</li>
                                <li>Add an extra blank line between the last option and the text of the next question.</li>
                                <li>Repeat for the next question.</li>
                            </ol>
                            Example:
                            <textarea className="textarea is-medium survey-editor" rows={11} value={
`How many hours do you spend doing homework each day?
0–2
2–4
4–6
6+

How many hours do you sleep each night?
0–5
5–7
7–9
...and so forth`} />
                        </Modal>
                    }
                </div>
            </section>
        );
    }
}

// Get the course information
const COURSE_QUERY = gql`
  query courseQuery($id: ID!) {
    course(id:$id){
        id
        title
        survey
    }
  }
`

const SAVE_SURVEY = gql`
mutation saveSurveyMutation(
    $courseId:ID!
    $survey:Json!
){
    updateSurvey(
        courseId: $courseId
        survey: $survey
    ){
        id
        survey
    }
}`

export default withAuthCheck(compose(
    graphql(COURSE_QUERY, {
        name: 'courseQuery',
        options: (props) => {
            return { variables: { id: props.match.params.courseId } }
        }
    }),
    graphql(SAVE_SURVEY, {name: 'saveSurveyMutation'}),
) (SurveyEditor), { instructor: true });
