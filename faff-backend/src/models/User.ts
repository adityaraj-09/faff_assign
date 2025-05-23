import { Model, DataTypes } from 'sequelize';
import sequelize from '../config/database';
import bcrypt from 'bcrypt';

class User extends Model {
  public id!: number;
  public name!: string;
  public email!: string;
  public password!: string;
  public role!: 'admin' | 'operator';
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;

  // Method to validate password
  public async validatePassword(password: string): Promise<boolean> {
    console.log("password", password);
    console.log("this.password", this.password);
    return bcrypt.compare(password, this.password);
  }
}

User.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false
    },
    email: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
      validate: {
        isEmail: true
      }
    },
    password: {
      type: DataTypes.STRING,
      allowNull: false
    },
    role: {
      type: DataTypes.ENUM('admin', 'operator'),
      allowNull: false,
      defaultValue: 'operator'
    }
  },
  {
    sequelize,
    tableName: 'faffs',
    hooks: {
      beforeCreate: async (user: User) => {
        if (user.password) {
          const salt = await bcrypt.genSalt(10);
          user.password = await bcrypt.hash(user.password, salt);
        }
        console.log(`[USER HOOK] Creating user: ${user.email}`);
      },
      afterCreate: async (user: User) => {
        console.log(`[USER HOOK] User created successfully: ${user.email} (ID: ${user.id})`);
      },
      beforeUpdate: async (user: User) => {
        if (user.changed('password')) {
          const salt = await bcrypt.genSalt(10);
          user.password = await bcrypt.hash(user.password, salt);
        }
        console.log(`[USER HOOK] Updating user: ${user.email} (ID: ${user.id})`);
      },
      afterUpdate: async (user: User) => {
        console.log(`[USER HOOK] User updated successfully: ${user.email} (ID: ${user.id})`);
      },
      beforeDestroy: async (user: User) => {
        console.log(`[USER HOOK] WARNING: About to delete user: ${user.email} (ID: ${user.id})`);
      },
      afterDestroy: async (user: User) => {
        console.log(`[USER HOOK] ALERT: User deleted: ${user.email} (ID: ${user.id})`);
      }
    }
  }
);

export default User; 