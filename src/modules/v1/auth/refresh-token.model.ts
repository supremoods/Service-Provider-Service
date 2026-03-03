import BaseModel from "@/core/database/base-model";
import { DataTypes, type ModelAttributes } from "sequelize";

export default class RefreshTokens extends BaseModel {
    declare id: string;
    declare user_id: string;
    declare token_hash: string;
    declare expires_at: Date;

    declare created_by_ip?: string | null;
    declare user_agent?: string | null;

    declare revoked_at?: Date | null;
    declare revoked_by_ip?: string | null;
    declare replaced_by_token_id?: string | null;
}

const fields: ModelAttributes = {
    user_id: {
        type: DataTypes.UUID,
        allowNull: false
    },
    token_hash: {
        type: DataTypes.STRING(128),
        allowNull: false,
        unique: {
            name: "refresh_tokens_token_hash_unique",
            msg: "Refresh token already exists"
        }
    },
    expires_at: {
        type: DataTypes.DATE,
        allowNull: false
    },
    created_by_ip: {
        type: DataTypes.STRING(64),
        allowNull: true
    },
    user_agent: {
        type: DataTypes.STRING(255),
        allowNull: true
    },
    revoked_at: {
        type: DataTypes.DATE,
        allowNull: true
    },
    revoked_by_ip: {
        type: DataTypes.STRING(64),
        allowNull: true
    },
    replaced_by_token_id: {
        type: DataTypes.UUID,
        allowNull: true
    }
};

RefreshTokens.initialize(fields, {
    tableName:RefreshTokens.name,
    comment: "Stores hashed refresh tokens for JWT refresh/rotation.",
    defaultAttributes:false
});
