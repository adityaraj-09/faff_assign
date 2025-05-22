import { Model, DataTypes } from 'sequelize';
import sequelize from '../config/database';
import Task from './Task';
import User from './User';

class Summary extends Model {
  public id!: number;
  public taskId!: number;
  public createdById!: number;
  public content!: string;
  public entities!: string[]; // Extracted entities (contact numbers, links, etc.)
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

Summary.init(
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
    createdById: {
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
    entities: {
      type: DataTypes.ARRAY(DataTypes.STRING),
      allowNull: false,
      defaultValue: []
    }
  },
  {
    sequelize,
    tableName: 'summaries',
    indexes: [
      {
        fields: ['taskId']
      },
      {
        fields: ['createdById']
      }
    ]
  }
);

// Define associations
Summary.belongsTo(Task, { foreignKey: 'taskId', as: 'task' });
Summary.belongsTo(User, { foreignKey: 'createdById', as: 'createdBy' });

export default Summary; 