import BaseAuthenticatorModel from "../../../core/auth/base-authenticator-model";
import { DataTypes, type ModelAttributes } from "sequelize"

export default class Users extends BaseAuthenticatorModel {
  declare id: string
  declare first_name: string
  declare last_name: string
  declare email: string
  declare mobile_number: string
  declare password_hash: string
  declare role_type: string
  declare account_type?: "admin" | "provider" | "customer"
  declare status: "pending" | "approved" | "rejected"
  declare created_at: Date
  declare last_login?: Date;
}

let fields: ModelAttributes = {
  id: {
    type: DataTypes.UUID,
    allowNull: false,
    primaryKey: true,
    defaultValue: DataTypes.UUIDV4
  },

  first_name: {
    type: DataTypes.STRING(100),
    allowNull: false
  },

  last_name: {
    type: DataTypes.STRING(100),
    allowNull: false
  },

  username: {
    type: DataTypes.STRING(150),
    allowNull: false,
    unique: {
      name: "users_username_unique",
      msg: "Username is already taken"
    },
  },

  email: {
    type: DataTypes.STRING(150),
    allowNull: false,
    unique: {
      name: "users_email_unique",
      msg: "Email address is already registered"
    },
    validate: {
      notEmpty: {
        msg: "Email address is required"
      },
      isEmail: {
        msg: "Email address must be a valid email format (example: user@example.com)"
      }
    }
  },

  mobile_number: {
    type: DataTypes.STRING(20),
    allowNull: true,
    validate: {
      is: {
        args: /^(09|\+639)\d{9}$/,
        msg: "Mobile number must be in format 09XXXXXXXXX or +639XXXXXXXXX"
      }
    }
  },

  password_hash: {
    type: DataTypes.STRING,
    allowNull: false
  },

  role_type: {
    type: DataTypes.STRING(50),
    allowNull: false
  },

  account_type: {
    type: DataTypes.ENUM("admin", "provider", "customer"),
    allowNull: true
  },

  status: {
    type: DataTypes.ENUM("pending", "approved", "rejected"),
    allowNull: false,
    defaultValue: "pending"
  },

  created_at: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW
  },

  last_login: {
    type: DataTypes.DATE,
    allowNull: true
  }
}

Users.initialize(fields, {
  tableName: Users.name,
  comment: "User model from auth.users schema",
  paranoid: false,
  defaultAttributes: false
})

Users.beforeCreate(async (user) => {
  user.updatePassword(user.password_hash)
});

Users.beforeUpdate(async (user) => {
  if (user.changed("password_hash")) {
    user.updatePassword(user.password_hash)
  }
});
