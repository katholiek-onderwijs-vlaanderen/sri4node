import { TResourceDefinition } from "../../sri4node";
import * as Sri4Node from '../../index';

module.exports = function (sri4node: typeof Sri4Node) {
  const $s = sri4node.schemaUtils;
  const $m = sri4node.mapUtils;

  const r : TResourceDefinition = {
    type: '/messages_with_person_and_communities',
    metaType: 'SRI4NODE_MESSAGES_WITH_PERSON_AND_COMMUNITIES',
    view: 'messages_with_person_and_communities',
    map: {
      key: {},
      personFirstname: {},
      personLastname: {},
      posted: {},
      type: {},
      title: {},
      description: {
        columnToField: [ $m.removeifnull ]
      },
      amount: {
        columnToField: [ $m.removeifnull ]
      },
      unit: {
        columnToField: [ $m.removeifnull ]
      },
      communityName: {
      }
    },
    schema: {
      $schema: 'http://json-schema.org/schema#',
      title: 'A product linked to a package.',
      type: 'object',
      properties: {
        key: $s.guid('Identifier.'),
        personFirstname: $s.string('First name of the the person that placed the message.'),
        personLastname: $s.string('Last name of the the person that placed the message.'),
        title: $s.string('A short summary of the message. A plain text string.'),
        description: $s.string('A more elaborate description. An HTML string.'),
        amount: $s.numeric('Amount suggested by the author.'),
        unit: $s.string('Unit in which amount was suggested by the author.'),
        communityName:  $s.string('Name of the community in which the message placed .'),
      },
      required: ['key', 'personFirstname', 'personLastname', 'type', 'title', 'communityName']
    },
  };
  return r;
};
