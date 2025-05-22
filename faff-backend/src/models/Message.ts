import { Model, DataTypes } from 'sequelize';
import sequelize from '../config/database';
import User from './User';
import Task from './Task';

export interface Attachment {
  id: string;
  filename: string;
  originalName: string;
  path: string;
  url: string;
  mimetype: string;
  size: number;
  createdAt: Date;
}

class Message extends Model {
  public id!: number;
  public taskId!: number;
  public senderId!: number;
  public content!: string;
  public replyToId!: number | null;
  public attachments!: Attachment[]; 
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

Message.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true
    },
    taskId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'tasks',
        key: 'id'
      }
    },
    senderId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'faffs',
        key: 'id'
      }
    },
    content: {
      type: DataTypes.TEXT,
      allowNull: false
    },
    replyToId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'messages',
        key: 'id'
      }
    },
    attachments: {
      type: DataTypes.JSONB,
      allowNull: false,
      defaultValue: []
    }
  },
  {
    sequelize,
    tableName: 'messages',
    indexes: [
      {
        fields: ['taskId']
      },
      {
        fields: ['senderId']
      },
      {
        fields: ['replyToId']
      }
    ]
  }
);

// Define associations
Message.belongsTo(Task, { foreignKey: 'taskId', as: 'task' });
Message.belongsTo(User, { foreignKey: 'senderId', as: 'sender' });
Message.belongsTo(Message, { foreignKey: 'replyToId', as: 'replyTo' });
Message.hasMany(Message, { foreignKey: 'replyToId', as: 'replies' });

export default Message; 