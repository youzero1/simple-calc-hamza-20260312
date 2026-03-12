import 'reflect-metadata';
import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

@Entity()
export class Calculation {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'varchar' })
  expression!: string;

  @Column({ type: 'varchar' })
  result!: string;

  @CreateDateColumn()
  createdAt!: Date;
}
