
import { Schema as bodySchema } from 'bodymen'
import { Schema as querySchema } from 'querymen'

export const queryValidator = (query, schema) => {
    return new Promise((resolve, reject) => {
        const _schema = new querySchema(schema);

        _schema.validate(query, function (err) {
            if (err) {
                return resolve(err)
            }
            return resolve({ valid: true, querymen: _schema.parse() })
        });
    })
}
export const bodyValidator = (query, schema) => {
    return new Promise((resolve, reject) => {
        const _schema = new bodySchema(schema);

        _schema.validate(query, function (err) {
            if (err) {
                return resolve(err)
            }
            return resolve({ valid: true, body: _schema.parse() })
        });
    })
}