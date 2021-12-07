const { assert } = require('chai');
const { hrefToParsedObjectFactory, flattenJsonSchema, hrtimeToMilliseconds, sortUrlQueryParamParseTree } = require('../../js/common');

const { generateNonFlatQueryStringParserGrammar, mergeArrays } = require('../../js/url_parsing/non_flat_url_parser')
const pegjs = require('pegjs');

const sriConfig = {
  resources: [
    {
      type: '/persons',
      metaType: 'PERSON',
      defaultlimit: 100,
      maxlimit: 1000,
      // is there a thing like defaultexpansion ???
      listResultDefaultIncludeCount: false,
      schema: {
        "type": "object",
        "properties": {
          "$$meta": {
            "type": "object",
            "properties": {
              "permalink": {
                "type": "string",
                "pattern": "^/persons/[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$"
              },
              "schema": {
                "type": "string",
                "description": "A link to the json schema for /persons.",
                "pattern": "^/persons/schema$"
              },
              "created": {
                "type": "string",
                "pattern": "^(1[8-9]|2[0-9])[0-9]{2}-[0-1][0-9]-[0-3][0-9]T([01][0-9]|2[0-3])(:([0-5][0-9])){2}(\\.[0-9]+)?Z$",
                "description": "The timestamp on which this resource was created (or imported if it was created before the import)."
              },
              "modified": {
                "type": "string",
                "pattern": "^(1[8-9]|2[0-9])[0-9]{2}-[0-1][0-9]-[0-3][0-9]T([01][0-9]|2[0-3])(:([0-5][0-9])){2}(\\.[0-9]+)?Z$",
                "description": "The timestamp on which this resource was last modified (or imported if it was last modified before the import)."
              },
              "deleted": {
                "type": "string",
                "pattern": "^(1[8-9]|2[0-9])[0-9]{2}-[0-1][0-9]-[0-3][0-9]T([01][0-9]|2[0-3])(:([0-5][0-9])){2}(\\.[0-9]+)?Z$",
                "description": "The timestamp on which this resource was deleted. If this property is present the resource is deleted, otherwise it is not deleted."
              },
              "type": {
                "enum": [
                  "PERSON"
                ]
              }
            }
          },
          "key": {
            "type": "string",
            "pattern": "^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$"
          },
          "sex": {
            "enum": [
              "FEMALE",
              "MALE"
            ]
          },
          "title": {
            "enum": [
              "Eerwaarde pater",
              "Ingenieur",
              "Hoogleraar",
              "Eerwaarde heer",
              "Eerwaarde zuster",
              "De heer",
              "Doctor",
              "Kanunnik",
              "Professor",
              "Mevrouw"
            ]
          },
          "firstName": {
            "type": "string",
            "pattern": "^[^\\s!\\?\\.0-9][^!\\?\\.0-9]*[^\\s!\\?\\.0-9]$|^[^\\s!\\?\\.0-9]$",
            "minLength": 1,
            "maxLength": 63
          },
          "lastName": {
            "type": "string",
            "pattern": "^[^\\s!\\?\\.0-9][^!\\?\\.0-9]*[^\\s!\\?\\.0-9]$|^[^\\s!\\?\\.0-9]$",
            "minLength": 1,
            "maxLength": 64
          },
          "username": {
            "type": "string",
            "pattern": "^[a-z0-9]+([\\._\\-][a-z0-9]+)*$",
            "minLength": 1,
            "maxLength": 128
          },
          "dateOfBirth": {
            "type": "string",
            "pattern": "^(1[8-9]|2[0-9])[0-9]{2}-[0-1][0-9]-[0-3][0-9]$"
          },
          "registrationNumber": {
            "type": "string",
            "pattern": "^[1-2][0-9]{2}[0-1][0-9][0-3][0-9][0-9]{4}$"
          },
          "nationalIdentityNumber": {
            "type": "string",
            "pattern": "^[0-9]{2}[0-1][0-9][0-3][0-9] [0-9]{3} [0-9]{2}$"
          },
          "deceased": {
            "type": "boolean",
            "description": "If not present it is false."
          },
          "emailAddresses": {
            "type": "object",
            "properties": {
              "primary": {
                "type": "object",
                "properties": {
                  "href": {
                    "type": "string",
                    "pattern": "^/contactdetails/[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$"
                  }
                },
                "required": [
                  "href"
                ]
              },
              "office": {
                "type": "object",
                "description": "This is the secundary e-mailAddress. The property name is wrong, but to many clients depend on it to change it.",
                "properties": {
                  "href": {
                    "type": "string",
                    "pattern": "^/contactdetails/[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$"
                  }
                },
                "required": [
                  "href"
                ]
              }
            }
          },
          "addresses": {
            "type": "object",
            "properties": {
              "personal": {
                "type": "object",
                "properties": {
                  "href": {
                    "type": "string",
                    "pattern": "^/contactdetails/[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$"
                  }
                },
                "required": [
                  "href"
                ]
              },
              "office": {
                "type": "object",
                "properties": {
                  "href": {
                    "type": "string",
                    "pattern": "^/contactdetails/[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$"
                  }
                },
                "required": [
                  "href"
                ]
              }
            }
          },
          "phones": {
            "type": "object",
            "properties": {
              "personal": {
                "type": "object",
                "properties": {
                  "href": {
                    "type": "string",
                    "pattern": "^/contactdetails/[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$"
                  }
                },
                "required": [
                  "href"
                ]
              },
              "office": {
                "type": "object",
                "properties": {
                  "href": {
                    "type": "string",
                    "pattern": "^/contactdetails/[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$"
                  }
                },
                "required": [
                  "href"
                ]
              },
              "mobile": {
                "type": "object",
                "properties": {
                  "href": {
                    "type": "string",
                    "pattern": "^/contactdetails/[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$"
                  }
                },
                "required": [
                  "href"
                ]
              }
            }
          },
          "bankAccounts": {
            "type": "object",
            "properties": {
              "wages": {
                "type": "object",
                "properties": {
                  "href": {
                    "type": "string",
                    "pattern": "^/bankaccounts/[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$"
                  }
                },
                "required": [
                  "href"
                ]
              },
              "expenseNotes": {
                "type": "object",
                "properties": {
                  "href": {
                    "type": "string",
                    "pattern": "^/bankaccounts/[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$"
                  }
                },
                "required": [
                  "href"
                ]
              }
            }
          }
        },
        "required": [
          "key",
          "firstName",
          "lastName",
          "username"
        ]
      },
    },
    {
      type: '/organisations',
      metaType: 'ORGANISATION',
      defaultlimit: 20,
      maxlimit: 200,
      listResultDefaultIncludeCount: true,
      schema: {
        "type": "object",
        "properties": {
          "$$meta": {
            "type": "object",
            "properties": {
              "permalink": {
                "type": "string",
                "pattern": "^/organisations/[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$"
              },
              "docs": {
                "type": "string",
                "description": "A link to the documentation for organisations."
              },
              "schema": {
                "type": "string",
                "pattern": "^/organisations/schema$",
                "description": "link to the json schema for organisations"
              },
              "type": {
                "enum": [
                  "ORGANISATION"
                ]
              }
            }
          },
          "key": {
            "type": "string",
            "pattern": "^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$"
          },
          "$$currentName": {
            "type": "string",
            "description": "The name of the detail, that is applicable today. It is recommended to use $$name, since it will also work for inactive organisations."
          },
          "$$name": {
            "type": "string",
            "description": "If the organisation is active today, it is the name of the detail that is applicable today. If the organisation was only active in the past, it is the name of the last detail. If the organisation is only active in the future, it is the name of the first detail."
          },
          "$$startDate": {
            "type": "string",
            "pattern": "^[1-2][0-9]{3}-[0-1][0-9]-[0-3][0-9]$",
            "description": "The start date of the organisation. This is the startDate of the first detail."
          },
          "$$endDate": {
            "type": "string",
            "pattern": "^[1-2][0-9]{3}-[0-1][0-9]-[0-3][0-9]$",
            "description": "The end date of the organisation. This is the endDate of the last detail."
          },
          "institutionNumber": {
            "type": "string",
            "pattern": "^[0-9]{6}$"
          },
          "purpose": {
            "type": "object",
            "properties": {
              "description": {
                "type": "string",
                "maxLength": 255
              },
              "vakgebied": {
                "type": "object",
                "properties": {
                  "href": {
                    "type": "string",
                    "pattern": "^/vakgebieden/[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$"
                  }
                }
              },
              "studiegebied": {
                "type": "object",
                "properties": {
                  "href": {
                    "type": "string",
                    "pattern": "^/studiegebieden/[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$"
                  }
                }
              },
              "theme": {
                "type": "object",
                "properties": {
                  "href": {
                    "type": "string",
                    "pattern": "^/themes/[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$"
                  }
                }
              },
              "mainstructures": {
                "type": "array",
                "items": {
                  "type": "object",
                  "properties": {
                    "href": {
                      "type": "string",
                      "pattern": "^/mainstructures/[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$"
                    }
                  }
                }
              },
              "ouTypeOfTargetGroup": {
                "enum": [
                  "SCHOOL",
                  "SCHOOLLOCATION",
                  "BOARDING",
                  "BOARDINGLOCATION",
                  "CLB",
                  "CLBLOCATION",
                  "CVO",
                  "GOVERNINGINSTITUTION",
                  "SCHOOLCOMMUNITY"
                ]
              }
            }
          },
          "details": {
            "type": "array",
            "minItems": 1,
            "items": {
              "type": "object",
              "properties": {
                "key": {
                  "type": "string",
                  "pattern": "^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$"
                },
                "startDate": {
                  "type": "string",
                  "pattern": "^[1-2][0-9]{3}-[0-1][0-9]-[0-3][0-9]$"
                },
                "endDate": {
                  "type": "string",
                  "pattern": "^[1-2][0-9]{3}-[0-1][0-9]-[0-3][0-9]$"
                },
                "name": {
                  "type": "string",
                  "maxLength": 128
                },
                "shortName": {
                  "type": "string",
                  "maxLength": 36
                },
                "callName": {
                  "type": "string",
                  "maxLength": 128
                },
                "statute": {
                  "enum": [
                    "BVBA",
                    "FEITELIJKE_VERENIGING",
                    "KOEPELVZW",
                    "NV",
                    "ONBEKEND",
                    "OVERHEID",
                    "VZW"
                  ]
                }
              },
              "required": [
                "key",
                "startDate",
                "name",
                "shortName"
              ]
            }
          },
          "seatAddresses": {
            "type": "array",
            "items": {
              "type": "object",
              "properties": {
                "key": {
                  "type": "string",
                  "pattern": "^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$"
                },
                "startDate": {
                  "type": "string",
                  "pattern": "^[1-2][0-9]{3}-[0-1][0-9]-[0-3][0-9]$"
                },
                "endDate": {
                  "type": "string",
                  "pattern": "^[1-2][0-9]{3}-[0-1][0-9]-[0-3][0-9]$"
                },
                "address": {
                  "type": "object",
                  "properties": {
                    "street": {
                      "type": "string"
                    },
                    "houseNumber": {
                      "type": "string"
                    },
                    "mailboxNumber": {
                      "type": "string"
                    },
                    "zipCode": {
                      "type": "string"
                    },
                    "city": {
                      "type": "string"
                    },
                    "subCity": {
                      "type": "string"
                    },
                    "country": {
                      "type": "string"
                    },
                    "streetHref": {
                      "type": "string"
                    },
                    "subCityHref": {
                      "type": "string"
                    },
                    "countryHref": {
                      "type": "string"
                    }
                  },
                  "required": [
                    "zipCode",
                    "city",
                    "country",
                    "countryHref"
                  ]
                }
              },
              "required": [
                "key",
                "startDate",
                "address"
              ]
            }
          },
          "addresses": {
            "description": "This is depricated. Don't use it anymore! Use seatAddresses and locations"
          },
          "type": {
            "enum": [
              "ANDERE",
              "BISDOM",
              "DIENST",
              "KOEPEL",
              "POLITIEK_ORGAAN",
              "BELEIDSORGAAN",
              "LEERPLANCOMMISSIE",
              "PROJECTGROEP",
              "VERGADERGROEP",
              "LERARENNETWERK"
            ]
          },
          "sensitive": {
            "type": "boolean"
          },
          "locations": {
            "type": "array",
            "items": {
              "type": "object",
              "properties": {
                "key": {
                  "type": "string",
                  "pattern": "^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$"
                },
                "startDate": {
                  "type": "string",
                  "pattern": "^[1-2][0-9]{3}-[0-1][0-9]-[0-3][0-9]$"
                },
                "endDate": {
                  "type": "string",
                  "pattern": "^[1-2][0-9]{3}-[0-1][0-9]-[0-3][0-9]$"
                },
                "address": {
                  "type": "object",
                  "properties": {
                    "street": {
                      "type": "string"
                    },
                    "houseNumber": {
                      "type": "string"
                    },
                    "mailboxNumber": {
                      "type": "string"
                    },
                    "zipCode": {
                      "type": "string"
                    },
                    "city": {
                      "type": "string"
                    },
                    "subCity": {
                      "type": "string"
                    },
                    "country": {
                      "type": "string"
                    },
                    "streetHref": {
                      "type": "string"
                    },
                    "subCityHref": {
                      "type": "string"
                    },
                    "countryHref": {
                      "type": "string"
                    }
                  },
                  "required": [
                    "zipCode",
                    "city",
                    "country",
                    "countryHref"
                  ]
                }
              },
              "required": [
                "key",
                "startDate",
                "address"
              ]
            }
          },
          "telecoms": {
            "type": "object",
            "properties": {
              "phones": {
                "type": "array",
                "items": {
                  "type": "object",
                  "properties": {
                    "key": {
                      "type": "string",
                      "pattern": "^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$"
                    },
                    "number": {
                      "type": "string",
                      "oneOf": [
                        {
                          "pattern": "^0[15-8][0-9] [0-9]{2} [0-9]{2} [0-9]{2}$"
                        },
                        {
                          "pattern": "^0[2-3] [0-9]{3} [0-9]{2} [0-9]{2}$"
                        },
                        {
                          "pattern": "^0[49] [23][0-9]{2} [0-9]{2} [0-9]{2}$"
                        },
                        {
                          "pattern": "^04[0-9]{2} [0-9]{2} [0-9]{2} [0-9]{2}$"
                        },
                        {
                          "pattern": "^\\+[0-9]{7}[0-9]{0,8}$"
                        },
                        {
                          "pattern": "^0800 [0-9]{2} [0-9]{3}$"
                        }
                      ]
                    },
                    "priority": {
                      "type": "integer"
                    }
                  },
                  "required": [
                    "key",
                    "number",
                    "priority"
                  ]
                }
              },
              "faxes": {
                "type": "array",
                "items": {
                  "type": "object",
                  "properties": {
                    "key": {
                      "type": "string",
                      "pattern": "^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$"
                    },
                    "number": {
                      "type": "string",
                      "oneOf": [
                        {
                          "pattern": "^0[15-8][0-9] [0-9]{2} [0-9]{2} [0-9]{2}$"
                        },
                        {
                          "pattern": "^0[2-3] [0-9]{3} [0-9]{2} [0-9]{2}$"
                        },
                        {
                          "pattern": "^0[49] [23][0-9]{2} [0-9]{2} [0-9]{2}$"
                        },
                        {
                          "pattern": "^\\+[0-9]{7}[0-9]{0,8}$"
                        },
                        {
                          "pattern": "^0800 [0-9]{2} [0-9]{3}$"
                        }
                      ]
                    },
                    "priority": {
                      "type": "integer"
                    }
                  },
                  "required": [
                    "key",
                    "number",
                    "priority"
                  ]
                }
              },
              "emails": {
                "type": "array",
                "items": {
                  "type": "object",
                  "properties": {
                    "key": {
                      "type": "string",
                      "pattern": "^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$"
                    },
                    "address": {
                      "type": "string",
                      "pattern": "^[_a-zA-Z0-9-&]+(\\.[_a-zA-Z0-9-&]+)*@[a-zA-Z0-9-]+(\\.[a-zA-Z0-9-]+)*\\.[a-zA-Z][a-zA-Z]+$"
                    },
                    "priority": {
                      "type": "integer"
                    }
                  },
                  "required": [
                    "key",
                    "address",
                    "priority"
                  ]
                }
              },
              "websites": {
                "type": "array",
                "items": {
                  "type": "object",
                  "properties": {
                    "key": {
                      "type": "string",
                      "pattern": "^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$"
                    },
                    "url": {
                      "type": "string",
                      "pattern": "^http\\://[a-zA-Z0-9\\-\\.]+\\.[a-zA-Z][a-zA-Z]+(/.*)*(\\?.*){0,1}$"
                    },
                    "priority": {
                      "type": "integer"
                    }
                  },
                  "required": [
                    "key",
                    "url",
                    "priority"
                  ]
                }
              }
            },
            "required": [
              "phones",
              "faxes",
              "emails",
              "websites"
            ]
          },
          "$$relations": {
            "type": "object",
            "description": "For now they are ignored by the PUT operation",
            "properties": {
              "subOrganisations": {
                "type": "array",
                "items": {
                  "type": "object",
                  "properties": {
                    "href": {
                      "type": "string"
                    },
                    "key": {
                      "type": "string",
                      "pattern": "^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$"
                    },
                    "startDate": {
                      "type": "string",
                      "pattern": "^[1-2][0-9]{3}-[0-1][0-9]-[0-3][0-9]$"
                    },
                    "endDate": {
                      "type": "string",
                      "pattern": "^[1-2][0-9]{3}-[0-1][0-9]-[0-3][0-9]$"
                    }
                  }
                }
              },
              "headOrganisations": {
                "type": "array",
                "items": {
                  "type": "object",
                  "properties": {
                    "href": {
                      "type": "string"
                    },
                    "key": {
                      "type": "string",
                      "pattern": "^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$"
                    },
                    "startDate": {
                      "type": "string",
                      "pattern": "^[1-2][0-9]{3}-[0-1][0-9]-[0-3][0-9]$"
                    },
                    "endDate": {
                      "type": "string",
                      "pattern": "^[1-2][0-9]{3}-[0-1][0-9]-[0-3][0-9]$"
                    }
                  }
                }
              }
            }
          }
        },
        "required": [
          "key",
          "details",
          "type",
          "telecoms"
        ]
      },
    },
    {
      type: '/responsibilities',
      metaType: 'RESPONSIBILITY',
      // defaultlimit: 50, // removed on purpose to check the default sri4node limits
      // maxlimit: 500, // removed on purpose to check the default sri4node limits
      // listResultDefaultIncludeCount: true, // removed on purpose to check the default sri4node limits
      schema: {
        "type": "object",
        "properties": {
          "$$meta": {
            "type": "object",
            "properties": {
              "permalink": {
                "type": "string",
                "pattern": "^/responsibilities/[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$"
              },
              "schema": {
                "type": "string",
                "description": "A link to the json schema for /responsibilities.",
                "pattern": "^/responsibilities/schema$"
              },
              "created": {
                "type": "string",
                "pattern": "^(1[8-9]|2[0-9])[0-9]{2}-[0-1][0-9]-[0-3][0-9]T([01][0-9]|2[0-3])(:([0-5][0-9])){2}(\\.[0-9]+)?Z$",
                "description": "The timestamp on which this resource was created (or imported if it was created before the import)."
              },
              "modified": {
                "type": "string",
                "pattern": "^(1[8-9]|2[0-9])[0-9]{2}-[0-1][0-9]-[0-3][0-9]T([01][0-9]|2[0-3])(:([0-5][0-9])){2}(\\.[0-9]+)?Z$",
                "description": "The timestamp on which this resource was last modified (or imported if it was last modified before the import)."
              },
              "deleted": {
                "type": "string",
                "pattern": "^(1[8-9]|2[0-9])[0-9]{2}-[0-1][0-9]-[0-3][0-9]T([01][0-9]|2[0-3])(:([0-5][0-9])){2}(\\.[0-9]+)?Z$",
                "description": "The timestamp on which this resource was deleted. If this property is present the resource is deleted, otherwise it is not deleted."
              },
              "type": {
                "enum": [
                  "RESPONSIBILITY"
                ]
              }
            }
          },
          "key": {
            "type": "string",
            "pattern": "^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$"
          },
          "person": {
            "type": "object",
            "properties": {
              "href": {
                "type": "string",
                "pattern": "^/persons/[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$"
              }
            },
            "required": [
              "href"
            ]
          },
          "organisation": {
            "type": "object",
            "properties": {
              "href": {
                "type": "string",
                "oneOf": [
                  {
                    "pattern": "^/organisations/[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$"
                  },
                  {
                    "pattern": "^/schools/[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$"
                  },
                  {
                    "pattern": "^/boardings/[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$"
                  },
                  {
                    "pattern": "^/governinginstitutions/[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$"
                  },
                  {
                    "pattern": "^/cvos/[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$"
                  },
                  {
                    "pattern": "^/clbs/[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$"
                  },
                  {
                    "pattern": "^/schoolcommunities/[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$"
                  },
                  {
                    "pattern": "^/sam/organisationalunits/[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$"
                  }
                ]
              }
            }
          },
          "position": {
            "type": "object",
            "properties": {
              "href": {
                "type": "string",
                "pattern": "^/positions/[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$"
              }
            },
            "required": [
              "href"
            ]
          },
          "customPositionTitle": {
            "type": "string",
            "minLength": 1,
            "maxLength": 64
          },
          "remark": {
            "type": "string",
            "minLength": 1,
            "maxLength": 256
          },
          "startDate": {
            "type": "string",
            "pattern": "^(1[8-9]|2[0-9])[0-9]{2}-[0-1][0-9]-[0-3][0-9]$"
          },
          "endDate": {
            "type": "string",
            "pattern": "^(1[8-9]|2[0-9])[0-9]{2}-[0-1][0-9]-[0-3][0-9]$"
          }
        },
        "required": [
          "key",
          "person",
          "organisation",
          "startDate"
        ]
      },
    },
  ],
};


const hrefToFlatParsedObject = hrefToParsedObjectFactory(sriConfig, true);
// let hrefToFlatParsedObjectExecutionTimes = [];


const hrefToNonFlatParsedObject = hrefToParsedObjectFactory(sriConfig);

let hrefToNonFlatParsedObjectExecutionTimes = [];
/**
 * This wraps the parse function to keep track of the execution times, so we can add
 * some tests add the end that check if the average execution speeds were high enough...
 *
 * @param {string} input the relative href to parse
 * @returns the parse tree object
 */
const hrefToNonFlatParsedObjectWrapped = (input) => {
  const hrstart = process.hrtime();
  const normalizedUrl = hrefToNonFlatParsedObject(input);
  const hrElapsed = process.hrtime(hrstart);
  hrefToNonFlatParsedObjectExecutionTimes.push(hrtimeToMilliseconds(hrElapsed));
  return normalizedUrl;
}


/**
 * Checks if hrefToParsedObject of input (with our 'global' sriConfig)
 * returns the same 'normalizedUrl' as the expected string.
 *
 * We are not checking the 'parse tree' (but since the normalized URL is generated
 * from that, we can be pretty confident that the parsing happened correctly)
 *
 * Especially if we test the 'parseTreeToNormalizedSearchParams' function separately.
 *
 * @param {String} input
 * @param {String} expected
 */
function checkHrefToFlatParsedObject(input, expected) {
  // try {
    const hrstart = process.hrtime();
    const normalizedUrl = hrefToFlatParsedObject(input);
    const hrElapsed = process.hrtime(hrstart);
    // console.log('                hrefToFlatParsedObject took', hrtimeToMilliseconds(hrElapsed), 'ms');

    const expectedSorted = {
      ...expected,
      parseTree: sortUrlQueryParamParseTree([...expected.parseTree]),
    };
    assert.deepStrictEqual(
      normalizedUrl,
      expectedSorted,
    );
  // } catch (e) {
  //   console.log('href parse error', e.message, e, e.stack);
  //   throw e;
  // }
}

/**
 * Only check if the expected param gets added, and whether its value is as expected
 *
 * @param {String} input
 * @param {String} paramName
 * @param {String} expectedParamValue: should be the default, either as configured in sriConfig or the sri4node default
 * @returns
 */
function checkhrefToFlatParsedObjectAddsMissing(input, paramName, expectedParamValue) {
  const hrstart = process.hrtime();
  const parsedUrl = hrefToFlatParsedObject(input);
  const hrElapsed = process.hrtime(hrstart);
  console.log('                hrefToFlatParsedObject took', hrtimeToMilliseconds(hrElapsed), 'ms');
  assert.isTrue(
    parsedUrl.parseTree.findIndex(f => f.operator === paramName) >= 0,
    `The expected query parameter '${paramName}' has not been added to the normalized url`,
  );
  assert.deepEqual(
    parsedUrl.parseTree.find(f => f.operator === paramName).value,
    expectedParamValue,
    `The expected query parameter '${paramName}' from the normalized url doesn't have the expected value ${Array.isArray(expectedParamValue) ? expectedParamValue.join() : expectedParamValue}`,
  );
}


/**
 * Only check if the expected param gets added IN THE RIGHT SUBTREE,
 * and whether its value is as expected.
 *
 * @param {String} inputHref the (relative) href that will be parsed
 * @param {String} expectedSubTreeName the subtree where the item should be located
 * @param {String} expectedParamValue: should be the default, either as configured in sriConfig or the sri4node default
 * @returns
 */
 function checkHrefToNonFlatParsedObjectContains(inputHref, expectedSubTreeName, expectedParseTreeItem) {
  const parsedUrl = hrefToNonFlatParsedObjectWrapped(inputHref);
  assert.deepInclude(
    parsedUrl.parseTree[expectedSubTreeName],
    expectedParseTreeItem,
    `The expected parseTree item '${JSON.stringify(expectedParseTreeItem)}' has not been added to the url parse tree in section '${expectedSubTreeName}'.
This is the actual subtree:
${JSON.stringify(parsedUrl.parseTree[expectedSubTreeName], null, 2)}`,
  )
  // assert.deepEqual(
  //   parsedUrl.parseTree.find(f => f.operator === paramName).value,
  //   expectedParamValue,
  //   `The expected query parameter '${paramName}' from the normalized url doesn't have the expected value ${Array.isArray(expectedParamValue) ? expectedParamValue.join() : expectedParamValue}`,
  // );
}

describe('commons.js: flattenJsonSchema(...)', () => {
  it('should produce a flattened json schem', () => {
    assert.deepEqual(
      flattenJsonSchema(
        {
          type: 'object',
          properties: {
            a: {
              type: 'object',
              properties: {
                b: { type: 'string' },
              },
            },
          },
        },
      ),
      {
        'a.b': { type: 'string' },
      },
    );

    assert.deepEqual(
      flattenJsonSchema({
        type: 'object',
        properties: {
          a: {
            type: 'object',
            properties: {
              bb: { type: 'string' },
              cc: {
                type: 'object',
                properties: {
                  ddd: {
                    type: 'boolean',
                  },
                },
              },
              ee: { type: 'boolean' },
            },
          },
          i: { type: 'number' },
        },
      }),
      {
        'a.bb': { type: 'string' },
        'a.cc.ddd': { type: 'boolean' },
        'a.ee': { type: 'boolean' },
        'i': { type: 'number' },
      },
    );

    assert.deepEqual(
      flattenJsonSchema({
        type: 'object',
        properties: {
          a: {
            type: 'object',
            properties: {
              bb: { type: 'number' },
              cc: {
                type: 'array',
                items: {
                    type: 'string',
                },
              },
            },
          },
        },
      }),
      {
        'a.bb': { type: 'number' },
        'a.cc[*]': { type: 'string' }, // is this what we want to indicate that something is an array
      },
    );

  });
});


describe('commons.js: sortUrlQueryParamParseTree(...)', () => {
  it('sorts a parseTree as expected', () => {
    const metaDeletedInFalse = { property: '$$meta.deleted', operator: 'IN', invertOperator: false, caseInsensitive: true, value: false };
    const firstNameInJohn = { property: 'firstName', operator: 'IN', invertOperator: false, caseInsensitive: true, value: 'John' };
    const limit30 = { operator: 'LIST_LIMIT', value: 30 };

    // const expansionFull = { operator: 'EXPANSION', value: 'FULL' };
    // 1:{property: '$$meta.deleted', operator: 'IN', value: Array(1)}
    // 2:{operator: 'LIST_LIMIT', value: 100}
    // 3:{operator: 'LIST_META_INCLUDE_COUNT', value: false}
    // 4:{property: 'firstName', operator: 'IN', invertOperator: false, value: Array(1), caseInsensitive: true}

    const sorted1 = sortUrlQueryParamParseTree([
      firstNameInJohn,
      metaDeletedInFalse,
    ])
    assert.deepStrictEqual(
      sorted1,
      [
        metaDeletedInFalse,
        firstNameInJohn,
      ],
    );

    const sorted2 = sortUrlQueryParamParseTree([
      limit30,
      firstNameInJohn,
      metaDeletedInFalse,
    ]);
    assert.deepStrictEqual(
      sorted2,
      [
        limit30,
        metaDeletedInFalse,
        firstNameInJohn,
      ],
    );
  });
});

/**
 * This should test if the grammar generator properly works that should produce
 * a non-flat parse tree.
 *
 * In this parser I also want to try to include the defaults immediatley in the pegjs output,
 * instead of adding a second step for adding the mssing defaults
 */
describe('non_flat_url_parser.js', () => {
  const parse = hrefToParsedObjectFactory(sriConfig);

  describe('parsing of standard filters', () => {
    it('mergeArrays (used for adding defaults) should work as expected', () => {
      assert.deepEqual(
        mergeArrays([1, 2], [2, 3]),
        [1, 2, 3],
      );
      assert.deepEqual(
        mergeArrays(
          [ { id: 1, comment: 'one' }, { id: 2, comment: 'two' } ],
          [ { id: 2, comment: 'TWO' }, { id: 3, comment: 'THREE' } ],
          (a,b) => a.id === b.id
        ),
        [ { id: 1, comment: 'one' }, { id: 2, comment: 'two' }, { id: 3, comment: 'THREE' } ],
      );
    });

    it('should put list control parameter in the right subsection', () => {
      // console.log(JSON.stringify(parse('limit=5')), null, 2));
      // const parsed = parse('/persons?limit=5');
      // console.log(JSON.stringify(parse('/persons?limit=5'), null, 2));
      checkHrefToNonFlatParsedObjectContains(
        '/persons?limit=5',
        'listControl',
        {
          operator: { name: 'LIST_LIMIT', type: 'integer', multiValued: false },
          value: 5,
        },
      );
      checkHrefToNonFlatParsedObjectContains(
        '/persons?orderBy=lastName,firstName',
        'listControl',
        {
          operator: { name: 'LIST_ORDER_BY', type: 'string', multiValued: true },
          value: ['lastName', 'firstName'],
        },
      );
    });

    it('should put mapping parameter in the right subsection', () => {
      assert.fail('Test (& functionality) not implemented');
      // console.log(JSON.stringify(parse('/persons?$$expand=person'), null, 2));
    });

    it('should add the proper defaults when missing', () => {
      const personsWithoutDefaultsHref = '/persons';

      checkHrefToNonFlatParsedObjectContains(
        personsWithoutDefaultsHref,
        'listControl',
        {
          operator: { name: 'LIST_LIMIT', type: 'integer', multiValued: false },
          value: 30,
        },
      );

      checkHrefToNonFlatParsedObjectContains(
        personsWithoutDefaultsHref,
        'listControl',
        {
          operator: { name: 'LIST_ORDER_BY', type: 'string', multiValued: true },
          value: ['$$meta.created', 'key'],
        },
      );

      checkHrefToNonFlatParsedObjectContains(
        personsWithoutDefaultsHref,
        'listControl',
        {
          operator: { name: 'LIST_ORDER_DESCENDING', type: 'boolean', multiValued: false },
          value: false,
        },
      );

    });

    it('should put property filter parameter in the right subsection', () => {
      checkHrefToNonFlatParsedObjectContains(
        '/persons?firstNameGreater=J',
        'rowFilters',
        {
          property: { name: 'firstName', type: 'string', multiValued: false },
          operator: { name: 'GT', multiValued: false },
          invertOperator: false,
          caseInsensitive: true,
          value: 'J',
        },
      );
    });

    it('should translate missing property filter operator (meaning EQUALS) to IN', () => {
      checkHrefToNonFlatParsedObjectContains(
        '/persons?firstName=John',
        'rowFilters',
        {
          property: { name: 'firstName', type: 'string', multiValued: false },
          operator: { name: 'IN', multiValued: true },
          invertOperator: false,
          caseInsensitive: true,
          value: ['John'],
        },
      );

      checkHrefToNonFlatParsedObjectContains(
        '/persons?deceased=true',
        'rowFilters',
        {
          property: { name: 'deceased', type: 'boolean', multiValued: false },
          operator: { name: 'IN', multiValued: true },
          invertOperator: false,
          caseInsensitive: true,
          value: [true],
        },
      );
    });

    it('should translate NOT LTE to GT (and all other similar cases)', () => {
      [ ['LT', 'GTE'], ['LTE', 'GT'], ['GT', 'LTE'], ['GTE', 'LT'] ]
        .forEach(
          ([inverted, translated]) => checkHrefToNonFlatParsedObjectContains(
            `/persons?firstName_NOT_${inverted}=John`,
            'rowFilters',
            {
              property: { name: 'firstName', type: 'string', multiValued: false },
              operator: { name: translated, multiValued: false },
              invertOperator: false,
              caseInsensitive: true,
              value: 'John',
            },
          )
        );
    });
  });

  describe('special cases related to backwards compatibilty', () => {
    /**
     * Imagine you have a resource with a property called limit.
     *
     * /things?limt=5 could mean "only return 5 resources in the result list",
     * or "give me all things where the property limit has the value 5)
     *
     * We define here that it will always have the second meaning in this case!
     *
     * /things?limt=5&_LIST_LIMIT=10 will return 10 things where limit=5
     */
    it('should give a property filter named after an old-school listControl filter (like limit) precedence', () => {
      assert.fail('Test (& functionality) not implemented');
    });
  });

  describe('related to arrays', () => {

    /**
     * Could we somehow find a nice syntax for nested arrays?
     * Hard to do when it's just a comma-separated list.
     * 1,2,3  => (a,b),(c,d),(e,f) could work, where the brackets look more like tuples than arrays
     * but maybe that is no problem.
     * It also makes it look like arithmetics, saying 'calculate the most inner brackets first'
     * and it solves any number of sublevels: (a,(b,z)),(c,d),(e,f)
     * 
     * Would this change our syntax as in: an array argument MUST always be surrounded by ()
     * meaning: firstName_IN=John,Doe would not work because an array is expected?
     *          (it should have been firstName_IN=(John,Doe) then)
     * OR if backwards compatibility is extremely important, we would allow this,
     * but then:
     *    is firstName_IN=(John,Doe) equivalent to firstName_IN=John,Doe
     *    OR does that mean firstName_IN=((John,Doe)) ???
     */
    it('should be able to handle comma-separated arrays as values', () => {
      assert.fail('Test (& functionality) not implemented');
    });
  });

  describe('special filters to help with special resources like periods or relations', () => {

    /**
     * In /organisations API, we have the following filters: statuses=ACTIVE,FUTURE,ABOLISHED
     * Something similar (which are basically filters that work on the PERIOD instead of the single
     * date) would be cool to have as a default.
     * Not sure yet if we should base this simply on the presence of a startDate and endDate field,
     * or whether there are fields starting with start and end (could be start,end or startTime,endTime
     * ...), or whether these fields should be configured specifically
     * (something similar to period: true, periodeStartfield:...)
     * 
     * _DATETIME=NOW()&_PERIODVALIDITY_IN=PAST,PRESENT,FUTURE (NOW() or $NOW or whatever should be
     * the default, but you should be able to override)
     * The _DATETIME could also be useful for other filters that might exist that need a reference
     * date/time.
     */
    it('should allow for some special default filters for resources with a time PERIOD', () => {
      console.log('                TO BE IMPLEMENTED IN A FUTURE VERSION (both tests and functionality)')
      // assert.fail('Test (& functionality) not implemented');
    });


    /**
     * In some API's we have a lot of filters that help us with traversing GRAPHS or tree-like
     * structures: tos=,froms=, fromTypes=, toTypes=..., depth
     * 
     * which would be 'normalized' as to.href_IN
     */
    it('should allow for some special default filters for resources expressing an EDGE', () => {
      console.log('                TO BE IMPLEMENTED IN A FUTURE VERSION (both tests and functionality)')
      // assert.fail('Test (& functionality) not implemented');
    });

    it('should allow combining default filters for resources expressing an EDGE and a PERIOD', () => {
      console.log('                TO BE IMPLEMENTED IN A FUTURE VERSION (both tests and functionality)')
      // assert.fail('Test (& functionality) not implemented');
    });
  });

  describe('parsing speed', () => {
    it('should be low on average', () => {
      const averageExecutionTime = hrefToNonFlatParsedObjectExecutionTimes.reduce((a,c) => a + c, 0) / (hrefToNonFlatParsedObjectExecutionTimes.length || 1);

      assert.isAtMost(
        averageExecutionTime,
        0.5,
        'Parsing is too slow on average!',
      );
    });
  });

});


describe('common.js: hrefToParsedObject(...)', () => {

  it('should add _LIST_LIMIT if missing', () => {
    checkhrefToFlatParsedObjectAddsMissing(
      '/persons?firstName=John',
      'LIST_LIMIT',
      100,
    );
    checkhrefToFlatParsedObjectAddsMissing(
      '/organisations?details%5B*%5D.name=Katholiek Onderwijs Vlaanderen',
      'LIST_LIMIT',
      20,
    );
    checkhrefToFlatParsedObjectAddsMissing(
      '/responsibilities?organisation.href=/organisations/123',
      'LIST_LIMIT',
      30,
    );
  });

  it('should translate limit to LIST_LIMIT', () => {
    checkhrefToFlatParsedObjectAddsMissing(
      '/persons?firstName=John&limit=33',
      'LIST_LIMIT',
      33,
    );
  });

  it('should add EXPANSION if missing', () => {
    checkhrefToFlatParsedObjectAddsMissing(
      '/persons?firstName=John',
      'EXPANSION',
      'FULL',
    );
    checkhrefToFlatParsedObjectAddsMissing(
      '/organisations?details%5B*%5D.name=Katholiek Onderwijs Vlaanderen',
      'EXPANSION',
      'FULL',
    );
    checkhrefToFlatParsedObjectAddsMissing(
      '/responsibilities?organisation.href=/organisations/123',
      'EXPANSION',
      'FULL',
    );
  });

  it('should translate expand to _EXPANSION', () => {
    checkhrefToFlatParsedObjectAddsMissing(
      '/persons?firstName=John&limit=33&expand=NONE',
      'EXPANSION',
      'NONE',
    );
  });

  it('should add _LIST_ORDER_BY if missing', () => {
    checkhrefToFlatParsedObjectAddsMissing(
      '/persons?firstName=John',
      'LIST_ORDER_BY',
      ['$$meta.created', 'key'],
    );
    checkhrefToFlatParsedObjectAddsMissing(
      '/organisations?details%5B*%5D.name=Katholiek Onderwijs Vlaanderen',
      'LIST_ORDER_BY',
      ['$$meta.created', 'key'],
    );
    checkhrefToFlatParsedObjectAddsMissing(
      '/responsibilities?organisation.href=/organisations/123',
      'LIST_ORDER_BY',
      ['$$meta.created','key'], // what is the defaults sort order?
    );
  });

  it('should translate orderBy to LIST_ORDER_BY', () => {
    checkhrefToFlatParsedObjectAddsMissing(
      '/persons?firstName=John&orderBy=lastName',
      'LIST_ORDER_BY',
      ['lastName'],
    );

    checkhrefToFlatParsedObjectAddsMissing(
      '/persons?firstName=John&orderBy=lastName,firstName',
      'LIST_ORDER_BY',
      ['lastName', 'firstName'],
    );
  });

  it('should add _LIST_ORDER_DESCENDING if missing', () => {
    checkhrefToFlatParsedObjectAddsMissing(
      '/persons?firstName=John',
      'LIST_ORDER_DESCENDING',
      false,
    );
    checkhrefToFlatParsedObjectAddsMissing(
      '/organisations?details%5B*%5D.name=Katholiek Onderwijs Vlaanderen',
      'LIST_ORDER_DESCENDING',
      false,
    );
    checkhrefToFlatParsedObjectAddsMissing(
      '/responsibilities?organisation.href=/organisations/123',
      'LIST_ORDER_DESCENDING',
      false,
    );
  });

  it('should translate descending to LIST_ORDER_DESCENDING', () => {
    checkhrefToFlatParsedObjectAddsMissing(
      '/persons?firstName=John&orderBy=firstName',
      'LIST_ORDER_DESCENDING',
      false,
    );
  });




  const defaultParseTreePart = (path) => [
    { operator: 'EXPANSION', value: sriConfig.resources.find(r => r.type === path).defaultexpansion || 'FULL' },
    { operator: 'LIST_LIMIT', value: sriConfig.resources.find(r => r.type === path).defaultlimit },
    { operator: 'LIST_META_INCLUDE_COUNT', value: false },
    { operator: 'LIST_ORDER_BY', value: ['$$meta.created', 'key'] },
    { operator: 'LIST_ORDER_DESCENDING', value: false },
    { property: '$$meta.deleted', operator: 'IN', value: [ false ], caseInsensitive: true, invertOperator: false },
  ];

  it('should return the parameters sorted alphabetically', () => {
    checkHrefToFlatParsedObject(
      '/persons?_LIST_LIMIT=30&$$meta.deleted_IN=false&_EXPANSION=FULL',
      // '$$meta.deleted_IN=false&_EXPANSION=FULL&_LIST_LIMIT=30'
      {
        parseTree: [
          // value could be a boolean if we make the parser even smarter based on the schema
          { property: '$$meta.deleted', operator: 'IN', invertOperator: false, value: [false], caseInsensitive: true },
          { operator: 'EXPANSION', value: 'FULL' },
          // value could be a number if we make the parser even smarter
          { operator: 'LIST_LIMIT', value: 30 },
          { operator: 'LIST_META_INCLUDE_COUNT', value: false },
          { operator: 'LIST_ORDER_BY', value: ['$$meta.created', 'key'] },
          { operator: 'LIST_ORDER_DESCENDING', value: false },
        ],
      },
    );
  });

  describe('should return the value(s) as the expected type (string, number, bool) depending on the configuration', () => {
    it('should return a string property filter as a string value', () => {
      checkHrefToFlatParsedObject(
        '/persons?firstName=John', // assuming defaults for limit & expansion
        {
          parseTree: [
            ...defaultParseTreePart('/persons'),
            { property: 'firstName', operator: "IN", invertOperator: false, value: ['John'], caseInsensitive: true },
          ],
        },
      );
    });

    // it('should not consider an argument as an array only because it contains a comma, but only if an array is expected', () => {
    //   checkHrefToParsedObject(
    //     '/persons?firstName=Bosco,%20Don', // assuming defaults for limit & expansion
    //     {
    //       parseTree: [
    //         ...defaultParseTreePart('/persons'),
    //         { property: 'firstName', operator: "IN", invertOperator: false, value: ['Bosco, Don'], caseInsensitive: true },
    //       ],
    //     },
    //   );
    // });

    // it('should return a boolean property filter as a boolean value', () => {
    //   checkHrefToParsedObject(
    //     '/persons?deceased=true', // assuming defaults for limit & expansion
    //     {
    //       parseTree: [
    //         ...defaultParseTreePart('/persons'),
    //         { property: 'deceased', operator: "IN", invertOperator: false, value: [true], caseInsensitive: true },
    //       ],
    //     },
    //   );

    //   checkHrefToParsedObject(
    //     '/persons?$$meta.deleted=any', // assuming defaults for limit & expansion
    //     {
    //       parseTree: [
    //         ...defaultParseTreePart('/persons'),
    //         { property: '$$meta.deleted', operator: "IN", invertOperator: false, value: [true, false], caseInsensitive: true },
    //       ],
    //     },
    //   );
    // });

    // it('should return an integer property filter as a number', () => {
    //   checkHrefToParsedObject(
    //     '/organisations?telecoms.websites[*].priority=2', // assuming defaults for limit & expansion
    //     {
    //       parseTree: [
    //         ...defaultParseTreePart('/organisations'),
    //         { property: 'telecoms.websites[*].priority', operator: "IN", invertOperator: false, value: [2], caseInsensitive: true },
    //       ],
    //     },
    //   );
    // });

    // it('should return a string array property filter as a array of strings value ', () => {
    //   checkHrefToParsedObject(
    //     '/persons?firstNameIn=John,Peter', // assuming defaults for limit & expansion
    //     {
    //       parseTree: [
    //         ...defaultParseTreePart('/persons'),
    //         { property: 'firstName', operator: "IN", invertOperator: false, value: ['John', 'Peter'], caseInsensitive: true },
    //       ],
    //     },
    //   );
    // });

  });

});
