const { assert } = require('chai');
const { hrefToParsedObject, flattenJsonSchema, hrtimeToMilliseconds, sortUrlQueryParamParseTree } = require('../../js/common');

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
function checkHrefToParsedObject(input, expected) {
  // try {
    const hrstart = process.hrtime();
    const normalizedUrl = hrefToParsedObject(input, sriConfig);
    const hrElapsed = process.hrtime(hrstart);
    console.log('                hrefToParsedObject took', hrtimeToMilliseconds(hrElapsed), 'ms');

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
function checkhrefToParsedObjectAddsMissing(input, paramName, expectedParamValue) {
  const hrstart = process.hrtime();
  const parsedUrl = hrefToParsedObject(input, sriConfig);
  const hrElapsed = process.hrtime(hrstart);
  console.log('                hrefToParsedObject took', hrtimeToMilliseconds(hrElapsed), 'ms');
  assert.isTrue(
    parsedUrl.parseTree.findIndex(f => f.operator === paramName) >= 0,
    `The expected query parameter '${paramName}' has not been added to the normalized url`,
  );
  assert.equal(
    parsedUrl.parseTree.find(f => f.operator === paramName).value,
    expectedParamValue,
    `The expected query parameter '${paramName}' from the normalized url doesn't have the expected value ${expectedParamValue}`,
  );
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
    const limit30 = { operator: 'LIMIT', value: 30 };

    // const expansionFull = { operator: 'EXPANSION', value: 'FULL' };
    // 1:{property: '$$meta.deleted', operator: 'IN', value: Array(1)}
    // 2:{operator: 'LIMIT', value: 100}
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

describe('common.js: hrefToParsedObject(...)', () => {

  it('should add _LIMIT if missing', () => {
    checkhrefToParsedObjectAddsMissing(
      '/persons?firstName=John',
      'LIMIT',
      100,
    );
    checkhrefToParsedObjectAddsMissing(
      '/organisations?details%5B*%5D.name=Katholiek Onderwijs Vlaanderen',
      'LIMIT',
      20,
    );
    checkhrefToParsedObjectAddsMissing(
      '/responsibilities?organisation.href=/organisations/123',
      'LIMIT',
      30,
    );
  });

  it('should translate limit to LIMIT', () => {
    checkhrefToParsedObjectAddsMissing(
      '/persons?firstName=John&limit=33',
      'LIMIT',
      33,
    );
  });

  it('should add EXPANSION if missing', () => {
    checkhrefToParsedObjectAddsMissing(
      '/persons?firstName=John',
      'EXPANSION',
      'FULL',
    );
    checkhrefToParsedObjectAddsMissing(
      '/organisations?details%5B*%5D.name=Katholiek Onderwijs Vlaanderen',
      'EXPANSION',
      'FULL',
    );
    checkhrefToParsedObjectAddsMissing(
      '/responsibilities?organisation.href=/organisations/123',
      'EXPANSION',
      'FULL',
    );
  });

  it('should translate expand to _EXPANSION', () => {
    checkhrefToParsedObjectAddsMissing(
      '/persons?firstName=John&limit=33&expand=NONE',
      'EXPANSION',
      'NONE',
    );
  });


  const defaultParseTreePart = (path) => [
    { operator: 'EXPANSION', value: sriConfig.resources.find(r => r.type === path).defaultexpansion || 'FULL' },
    { operator: 'LIMIT', value: sriConfig.resources.find(r => r.type === path).defaultlimit },
    { operator: 'LIST_META_INCLUDE_COUNT', value: false },
    { property: '$$meta.deleted', operator: 'IN', value: [ false ], caseInsensitive: true, invertOperator: false },
  ];

  it('should return the parameters sorted alphabetically', () => {
    checkHrefToParsedObject(
      '/persons?_LIMIT=30&$$meta.deleted_IN=false&_EXPANSION=FULL',
      // '$$meta.deleted_IN=false&_EXPANSION=FULL&_LIMIT=30'
      {
        parseTree: [
          // value could be a boolean if we make the parser even smarter based on the schema
          { property: '$$meta.deleted', operator: 'IN', invertOperator: false, value: [false], caseInsensitive: true },
          { operator: 'EXPANSION', value: 'FULL' },
          // value could be a number if we make the parser even smarter
          { operator: 'LIMIT', value: 30 },
          { operator: 'LIST_META_INCLUDE_COUNT', value: false },
        ],
      },
    );
  });

  describe('should return the value(s) as the expected type (string, number, bool) depending on the configuration', () => {
    it('should return a string property filter as a string value', () => {
      checkHrefToParsedObject(
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
