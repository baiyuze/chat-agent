import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from "typeorm";

@Entity("chat_messages")
@Index(["sessionId", "createdAt"])
export class ChatMessageEntity {
  @PrimaryGeneratedColumn("increment", { type: "bigint" })
  id!: string;

  @Column({ name: "session_id", type: "varchar", length: 64 })
  sessionId!: string;

  @Column({ type: "varchar", length: 16 })
  role!: "user" | "assistant";

  @Column({ type: "text" })
  content!: string;

  @CreateDateColumn({ name: "created_at", type: "timestamptz" })
  createdAt!: Date;
}
