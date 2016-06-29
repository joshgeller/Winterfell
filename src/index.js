var React = require('react');
var _     = require('lodash').noConflict();
var Validation    = require('./lib/validation');

var QuestionPanel = require('./questionPanel');

class Winterfell extends React.Component {

  constructor(props) {
    super(props);

    this._questionPanel = null;
    this.panelHistory = [];

    var schema = _.extend({
      classes        : {},
      formPanels     : [],
      questionPanels : [],
      questionSets   : [],
    }, this.props.schema);

    schema.formPanels = schema.formPanels
                              .sort((a, b) => a.index > b.index);

    var panelId = (typeof this.props.panelId !== 'undefined'
                     ? this.props.panelId
                     : schema.formPanels.length > 0
                         ? schema.formPanels[0].panelId
                         : undefined);

    var currentPanel = typeof schema !== 'undefined'
                         && typeof schema.formPanels !== 'undefined'
                         && typeof panelId !== 'undefined'
                         ? _.find(schema.formPanels,
                               panel => panel.panelId == panelId)
                         : undefined;

    if (!currentPanel) {
      throw new Error('Winterfell: Could not find initial panel and failed to render.');
    }

    this.state = {
      schema          : schema,
      currentPanel    : currentPanel,
      action          : this.props.action,
      questionAnswers : this.props.questionAnswers
    };
  }

  componentWillReceiveProps(nextProps) {
    this.setState({
      action          : nextProps.action,
      schema          : nextProps.schema,
      questionAnswers : nextProps.questionAnswers
    });
    if (!_.isEqual(nextProps.questionAnswers, this.props.questionAnswers)) {
      this.props.onUpdate.bind(null, nextProps.questionAnswers)
    }
  }

  validatePanels() {
    var validPanelIds = [];
    for (var qP in this.state.schema.questionPanels) {
      var questionPanel = this.state.schema.questionPanels[qP];
      var questionSetIds = questionPanel.questionSets.map(qS => qS.questionSetId);
      var questionSets   = _.chain(this.state.schema.questionSets)
                            .filter(qS => questionSetIds.indexOf(qS.questionSetId) > -1)
                            .value();
      var invalidQuestions = Validation.getQuestionPanelInvalidQuestions(
        questionSets, this.state.questionAnswers
      );
      if (_.isEmpty(invalidQuestions)) {
        validPanelIds.push(questionPanel.panelId);
      }
    }
    this.props.onValidatePanels(validPanelIds);
  }

  handleAnswerChange(questionId, questionAnswer) {
    var questionAnswers = _.chain(this.state.questionAnswers)
                           .set(questionId, questionAnswer)
                           .value();

    this.setState({
      questionAnswers : questionAnswers,
    }, this.props.onUpdate.bind(null, questionAnswers));
  }

  handleSwitchPanel(panelId, preventHistory) {

    let updateState = true;

    var panel = _.find(this.props.schema.formPanels, {
      panelId : panelId
    });

    if (!panel) {
      throw new Error('Winterfell: Tried to switch to panel "'
                      + panelId + '", which does not exist.');
    }

    var currentPanel = _.find(this.props.schema.formPanels, {
      panelId: this.panelHistory[this.panelHistory.length - 1]
    });

    if (currentPanel && currentPanel != panel) {
          // If we are moving to the next panel, validate the current one
          if (panel.index > currentPanel.index) {
              if (this._questionPanel.validatePanel() === false) {
                  // If current panel is invalid, do not update state
                  updateState = false;
                  return;
              } else {
                  // If validation is okay, add new panel to panel history
                  this.panelHistory.push(panel.panelId);
              }
          } else {
            // Going backwards
            this.panelHistory.pop();
          }
      } else {
          // Same panel, do nothing
          return;
      }
      const nextPanel = updateState ? panel : currentPanel
      this.setState({
        currentPanel : nextPanel
      }, this.props.onSwitchPanel.bind(null, nextPanel));
  }

  handleBackButtonClick() {
    this.handleSwitchPanel.call(
      this, this.panelHistory[this.panelHistory.length - 2], true
    );
  }

  handleSubmit(action) {
    if (this.props.disableSubmit) {
      this.props.onSubmit(this.state.questionAnswers, action);
      return;
    }

    /*
     * If we are not disabling the functionality of the form,
     * we need to set the action provided in the form, then submit.
     */
    this.setState({
      action : action
    }, () => {
      React.findDOMNode(this.refs[this.props.ref])
           .submit();
    });
  }

  handleValidatePanel(isValid) {
    this.props.onValidatePanel(
      this.state.currentPanel.panelId,
      isValid
    )
  }

  render() {
    var currentPanel = _.find(this.state.schema.questionPanels,
                          panel => panel.panelId == this.state.currentPanel.panelId);

    var isValid = this.props.validPanelIds.indexOf(currentPanel.panelId) > -1

    return (
      <form method={this.props.method}
        encType={this.props.encType}
        action={this.state.action}
        ref={this.props.ref}
        className={this.state.schema.classes.form}>
        <div className={this.state.schema.classes.questionPanels}>
          <QuestionPanel schema={this.state.schema}
            classes={this.state.schema.classes}
            live={this.props.live}
            panelId={currentPanel.panelId}
            panelIndex={currentPanel.panelIndex}
            panelHeader={currentPanel.panelHeader}
            panelText={currentPanel.panelText}
            action={currentPanel.action}
            button={currentPanel.button}
            backButton={currentPanel.backButton}
            questionSets={currentPanel.questionSets}
            questionAnswers={this.state.questionAnswers}
            panelHistory={this.panelHistory}
            publishButton={this.props.publishButton}
            ref={(qP) => this._questionPanel = qP}
            renderError={this.props.renderError}
            renderRequiredAsterisk={this.props.renderRequiredAsterisk}
            onAnswerChange={this.handleAnswerChange.bind(this)}
            onPanelBack={this.handleBackButtonClick.bind(this)}
            onSwitchPanel={this.handleSwitchPanel.bind(this)}
            onSubmit={this.handleSubmit.bind(this)}
            onSubmit={this.handleSubmit.bind(this)}
            onValidatePanel={this.handleValidatePanel.bind(this)}
            isValid={isValid}
          />
        </div>
      </form>
    );
  }

  componentDidMount() {
    this.panelHistory.push(this.state.currentPanel.panelId);
    this.props.onRender();
  }

};

// @todo: Proptypes
Winterfell.defaultProps = {
  schema                 : {
    formPanels     : [],
    questionPanels : [],
    questionSets   : [],
    classes        : {}
  },
  questionAnswers        : {},
  ref                    : 'form',
  encType                : 'application/x-www-form-urlencoded',
  method                 : 'POST',
  action                 : '',
  panelId                : undefined,
  publishButton          : undefined,
  disableSubmit          : false,
  live                   : false,
  renderError            : undefined,
  renderRequiredAsterisk : undefined,
  onSubmit               : () => {},
  onUpdate               : () => {},
  onSwitchPanel          : () => {},
  onRender               : () => {},
  onValidatePanel        : () => {},
  onValidatePanels       : () => {},
  validPanelIds          : [],
};

Winterfell.inputTypes    = require('./inputTypes');
Winterfell.errorMessages = require('./lib/errors');
Winterfell.validation    = Validation;

Winterfell.addInputType  = Winterfell.inputTypes.addInputType;
Winterfell.addInputTypes = Winterfell.inputTypes.addInputTypes;

Winterfell.addErrorMessage  = Winterfell.errorMessages.addErrorMessage;
Winterfell.addErrorMessages = Winterfell.errorMessages.addErrorMessages;

Winterfell.addValidationMethod  = Winterfell.validation.addValidationMethod;
Winterfell.addValidationMethods = Winterfell.validation.addValidationMethods;

module.exports = Winterfell;
