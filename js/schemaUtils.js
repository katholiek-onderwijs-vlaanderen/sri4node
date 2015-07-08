exports = module.exports = {
    permalink: function(type, description) {
        var parts = type.split("/");
        var name = parts[1];

        return {
            type: "object",
            properties: {
                href: {
                    type: "string",
                    pattern: "^\/" + name + "\/[-0-9a-f].*$",
                    minLength: name.length + 38,
                    maxLength: name.length + 38,
                    description: description
                }
            },
            required: ["href"]
        };
    },

    string: function(description, min, max) {
        ret = {
            type: "string",
            description: description
        };
        if(min) ret.minLength = min;
        if(max) ret.maxLength = max;
        return ret;
    },

    numeric: function(description) {
        return {
            type: "numeric",
            multipleOf: "1.0",
            description: description
        }
    },

    email: function(description) {
        return {
            type: "string",
            format: "email",
            minLength: 1,
            maxLength: 254,
            description: description
        }
    },

    url: function(description) {
        return {
            type: "string",
            minLength: 1,
            maxLength: 2000,
            format: "uri",
            description: description
        }
    },

    belgianzipcode: function(description) {
        return {
            type: "string",
            pattern: "^[0-9][0-9][0-9][0-9]$",
            description: description
        };
    },

    phone: function(description) {
        return {
            type: "string",
            pattern: "^[0-9]*$",
            minLength: 9,
            maxLength: 10,
            description: description
        };
    },

    timestamp : function(description) {
        return {
            type: "string",
            format: "date-time",
            description: description
        }
    },

    boolean : function(description) {
        return {
            type: "boolean",
            description: description
        }
    },
    
    key: function(description) {
        return {
            type: "string",
            description: description,
            pattern: "^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$"
            
        };
    },


}