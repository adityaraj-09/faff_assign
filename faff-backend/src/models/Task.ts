import { Model, DataTypes } from 'sequelize';
import sequelize from '../config/database';
import User from './User';

export type TaskStatus = 'Logged' | 'Ongoing' | 'Reviewed' | 'Done' | 'Blocked';

class Task extends Model {
  public id!: number;
  public title!: string;
  public description!: string;
  public stepsToReproduce!: string[];
  public requestedById!: number;
  public assignedToId!: number | null;
  public status!: TaskStatus;
  public priority!: 'low' | 'medium' | 'high' | 'urgent';
  public tags!: string[];
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

Task.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true
    },
    title: {
      type: DataTypes.STRING,
      allowNull: false
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
      defaultValue: ''
    },
    stepsToReproduce: {
      type: DataTypes.ARRAY(DataTypes.STRING),
      allowNull: false,
      defaultValue: []
    },
    requestedById: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'faffs',
        key: 'id'
      }
    },
    assignedToId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'faffs',
        key: 'id'
      }
    },
    status: {
      type: DataTypes.ENUM('Logged', 'Ongoing', 'Reviewed', 'Done', 'Blocked'),
      allowNull: false,
      defaultValue: 'Logged'
    },
    priority: {
      type: DataTypes.ENUM('low', 'medium', 'high', 'urgent'),
      allowNull: false,
      defaultValue: 'medium'
    },
    tags: {
      type: DataTypes.ARRAY(DataTypes.STRING),
      allowNull: false,
      defaultValue: []
    }
  },
  {
    sequelize,
    tableName: 'tasks',
    indexes: [
      {
        fields: ['status']
      },
      {
        fields: ['assignedToId']
      },
      {
        fields: ['requestedById']
      },
      {
        fields: ['priority']
      }
    ]
  }
);

// Define associations
Task.belongsTo(User, { foreignKey: 'requestedById', as: 'requestedBy' });
Task.belongsTo(User, { foreignKey: 'assignedToId', as: 'assignedTo' });

export default Task; 