import { Model, DataTypes } from 'sequelize';
import sequelize from '../config/database';
import Message from './Message';
import User from './User';

class QAReview extends Model {
  public id!: number;
  public messageId!: number;
  public reviewerId!: number;
  public status!: 'pending' | 'approved' | 'rejected';
  public feedback!: string | null;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

QAReview.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true
    },
    messageId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'messages',
        key: 'id'
      }
    },
    reviewerId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'faffs',
        key: 'id'
      }
    },
    status: {
      type: DataTypes.ENUM('pending', 'approved', 'rejected'),
      allowNull: false,
      defaultValue: 'pending'
    },
    feedback: {
      type: DataTypes.TEXT,
      allowNull: true
    }
  },
  {
    sequelize,
    tableName: 'qa_reviews',
    indexes: [
      {
        fields: ['messageId']
      },
      {
        fields: ['reviewerId']
      },
      {
        fields: ['status']
      }
    ]
  }
);

// Define associations
QAReview.belongsTo(Message, { foreignKey: 'messageId', as: 'message' });
QAReview.belongsTo(User, { foreignKey: 'reviewerId', as: 'reviewer' });

export default QAReview; 