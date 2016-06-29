'use strict';

var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ('value' in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

var _get = function get(_x, _x2, _x3) { var _again = true; _function: while (_again) { var object = _x, property = _x2, receiver = _x3; _again = false; if (object === null) object = Function.prototype; var desc = Object.getOwnPropertyDescriptor(object, property); if (desc === undefined) { var parent = Object.getPrototypeOf(object); if (parent === null) { return undefined; } else { _x = parent; _x2 = property; _x3 = receiver; _again = true; desc = parent = undefined; continue _function; } } else if ('value' in desc) { return desc.value; } else { var getter = desc.get; if (getter === undefined) { return undefined; } return getter.call(receiver); } } };

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError('Cannot call a class as a function'); } }

function _inherits(subClass, superClass) { if (typeof superClass !== 'function' && superClass !== null) { throw new TypeError('Super expression must either be null or a function, not ' + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var React = require('react');
var _ = require('lodash').noConflict();
var Validation = require('./lib/validation');

var QuestionPanel = require('./questionPanel');

var Winterfell = (function (_React$Component) {
  _inherits(Winterfell, _React$Component);

  function Winterfell(props) {
    _classCallCheck(this, Winterfell);

    _get(Object.getPrototypeOf(Winterfell.prototype), 'constructor', this).call(this, props);

    this._questionPanel = null;
    this.panelHistory = [];

    var schema = _.extend({
      classes: {},
      formPanels: [],
      questionPanels: [],
      questionSets: []
    }, this.props.schema);

    schema.formPanels = schema.formPanels.sort(function (a, b) {
      return a.index > b.index;
    });

    var panelId = typeof this.props.panelId !== 'undefined' ? this.props.panelId : schema.formPanels.length > 0 ? schema.formPanels[0].panelId : undefined;

    var currentPanel = typeof schema !== 'undefined' && typeof schema.formPanels !== 'undefined' && typeof panelId !== 'undefined' ? _.find(schema.formPanels, function (panel) {
      return panel.panelId == panelId;
    }) : undefined;

    if (!currentPanel) {
      throw new Error('Winterfell: Could not find initial panel and failed to render.');
    }

    this.state = {
      schema: schema,
      currentPanel: currentPanel,
      action: this.props.action,
      questionAnswers: this.props.questionAnswers
    };
  }

  _createClass(Winterfell, [{
    key: 'componentWillReceiveProps',
    value: function componentWillReceiveProps(nextProps) {
      this.setState({
        action: nextProps.action,
        schema: nextProps.schema,
        questionAnswers: nextProps.questionAnswers
      });
      if (!_.isEqual(nextProps.questionAnswers, this.props.questionAnswers)) {
        this.props.onUpdate.bind(null, nextProps.questionAnswers);
      }
    }
  }, {
    key: 'validatePanels',
    value: function validatePanels() {
      var validPanelIds = [];
      for (var qP in this.state.schema.questionPanels) {
        var questionPanel = this.state.schema.questionPanels[qP];
        var questionSetIds = questionPanel.questionSets.map(function (qS) {
          return qS.questionSetId;
        });
        var questionSets = _.chain(this.state.schema.questionSets).filter(function (qS) {
          return questionSetIds.indexOf(qS.questionSetId) > -1;
        }).value();
        var invalidQuestions = Validation.getQuestionPanelInvalidQuestions(questionSets, this.state.questionAnswers);
        if (_.isEmpty(invalidQuestions)) {
          validPanelIds.push(questionPanel.panelId);
        }
      }
      this.props.onValidatePanels(validPanelIds);
      return validPanelIds;
    }
  }, {
    key: 'handleAnswerChange',
    value: function handleAnswerChange(questionId, questionAnswer) {
      var questionAnswers = _.chain(this.state.questionAnswers).set(questionId, questionAnswer).value();

      this.setState({
        questionAnswers: questionAnswers
      }, this.props.onUpdate.bind(null, questionAnswers));
    }
  }, {
    key: 'handleSwitchPanel',
    value: function handleSwitchPanel(panelId, preventHistory, validateOnRender) {
      var _this = this;

      var updateState = true;

      var panel = _.find(this.props.schema.formPanels, {
        panelId: panelId
      });

      if (!panel) {
        throw new Error('Winterfell: Tried to switch to panel "' + panelId + '", which does not exist.');
      }

      var currentPanel = this.panelHistory.length > 1 ? _.find(this.props.schema.formPanels, {
        panelId: this.panelHistory[this.panelHistory.length - 1]
      }) : this.props.schema.formPanels[0];

      // If we are moving to a new panel, validate the current one
      if (panel.index >= currentPanel.index) {
        if (this._questionPanel.validatePanel(true) === false) {
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
      var nextPanel = updateState ? panel : currentPanel;
      this.setState({
        currentPanel: nextPanel
      }, function () {
        _this.props.onSwitchPanel(nextPanel);
        if (validateOnRender) {
          _this._questionPanel.validatePanel(true);
        }
      });
    }
  }, {
    key: 'handleBackButtonClick',
    value: function handleBackButtonClick() {
      this.handleSwitchPanel.call(this, this.panelHistory[this.panelHistory.length - 2], true);
    }
  }, {
    key: 'handleSubmit',
    value: function handleSubmit(action) {
      var _this2 = this;

      if (this.props.disableSubmit) {
        this.props.onSubmit(this.state.questionAnswers, action);
        return;
      }

      /*
       * If we are not disabling the functionality of the form,
       * we need to set the action provided in the form, then submit.
       */
      this.setState({
        action: action
      }, function () {
        React.findDOMNode(_this2.refs[_this2.props.ref]).submit();
      });
    }
  }, {
    key: 'handleValidatePanel',
    value: function handleValidatePanel(isValid) {
      this.props.onValidatePanel(this.state.currentPanel.panelId, isValid);
    }
  }, {
    key: 'render',
    value: function render() {
      var _this3 = this;

      var currentPanel = _.find(this.state.schema.questionPanels, function (panel) {
        return panel.panelId == _this3.state.currentPanel.panelId;
      });

      var isValid = this.props.validPanelIds.indexOf(currentPanel.panelId) > -1;

      return React.createElement(
        'form',
        { method: this.props.method,
          encType: this.props.encType,
          action: this.state.action,
          ref: this.props.ref,
          className: this.state.schema.classes.form },
        React.createElement(
          'div',
          { className: this.state.schema.classes.questionPanels },
          React.createElement(QuestionPanel, { schema: this.state.schema,
            classes: this.state.schema.classes,
            live: this.props.live,
            panelId: currentPanel.panelId,
            panelIndex: currentPanel.panelIndex,
            panelHeader: currentPanel.panelHeader,
            panelText: currentPanel.panelText,
            action: currentPanel.action,
            button: currentPanel.button,
            backButton: currentPanel.backButton,
            questionSets: currentPanel.questionSets,
            questionAnswers: this.state.questionAnswers,
            panelHistory: this.panelHistory,
            publishButton: this.props.publishButton,
            ref: function (qP) {
              return _this3._questionPanel = qP;
            },
            renderError: this.props.renderError,
            renderRequiredAsterisk: this.props.renderRequiredAsterisk,
            onAnswerChange: this.handleAnswerChange.bind(this),
            onPanelBack: this.handleBackButtonClick.bind(this),
            onSwitchPanel: this.handleSwitchPanel.bind(this),
            onSubmit: this.handleSubmit.bind(this),
            onSubmit: this.handleSubmit.bind(this),
            onValidatePanel: this.handleValidatePanel.bind(this),
            isValid: isValid
          })
        )
      );
    }
  }, {
    key: 'componentDidMount',
    value: function componentDidMount() {
      this.panelHistory.push(this.state.currentPanel.panelId);
      this.props.onRender();
    }
  }]);

  return Winterfell;
})(React.Component);

;

// @todo: Proptypes
Winterfell.defaultProps = {
  schema: {
    formPanels: [],
    questionPanels: [],
    questionSets: [],
    classes: {}
  },
  questionAnswers: {},
  ref: 'form',
  encType: 'application/x-www-form-urlencoded',
  method: 'POST',
  action: '',
  panelId: undefined,
  publishButton: undefined,
  disableSubmit: false,
  live: false,
  renderError: undefined,
  renderRequiredAsterisk: undefined,
  onSubmit: function onSubmit() {},
  onUpdate: function onUpdate() {},
  onSwitchPanel: function onSwitchPanel() {},
  onRender: function onRender() {},
  onValidatePanel: function onValidatePanel() {},
  onValidatePanels: function onValidatePanels() {},
  validPanelIds: []
};

Winterfell.inputTypes = require('./inputTypes');
Winterfell.errorMessages = require('./lib/errors');
Winterfell.validation = Validation;

Winterfell.addInputType = Winterfell.inputTypes.addInputType;
Winterfell.addInputTypes = Winterfell.inputTypes.addInputTypes;

Winterfell.addErrorMessage = Winterfell.errorMessages.addErrorMessage;
Winterfell.addErrorMessages = Winterfell.errorMessages.addErrorMessages;

Winterfell.addValidationMethod = Winterfell.validation.addValidationMethod;
Winterfell.addValidationMethods = Winterfell.validation.addValidationMethods;

module.exports = Winterfell;