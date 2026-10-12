#!/usr/bin/env python3
from datetime import datetime
from typing import Dict, List, Optional, Any
from dataclasses import dataclass
from enum import Enum
import logging
from collections import deque

logger = logging.getLogger("langgraph")

class NodeType(Enum):
    START = "start"
    END = "end"
    PROMPT = "prompt"
    LLM = "llm"
    TOOL = "tool"
    DECISION = "decision"
    BRANCH = "branch"

@dataclass
class WorkflowNode:
    node_id: str
    type: NodeType
    label: str
    config: Dict
    edges: List[str]

@dataclass
class Workflow:
    workflow_id: str
    name: str
    description: str
    nodes: Dict[str, WorkflowNode]
    start_node: str
    created_at: str

class WorkflowExecutionError(Exception):
    pass

class LangGraphWorkflow:
    def __init__(self):
        self.workflows = self._init_workflows()
        self.execution_history: List[Dict] = []

    def _init_workflows(self) -> Dict[str, Workflow]:
        return {
            "storytelling_workflow": Workflow(
                workflow_id="storytelling_workflow",
                name="故事讲述工作流",
                description="根据用户请求生成并讲述故事",
                nodes={
                    "start": WorkflowNode("start", NodeType.START, "开始", {}, ["analyze_input"]),
                    "analyze_input": WorkflowNode("analyze_input", NodeType.LLM, "分析用户输入", {"model": "llama3.2:1b"}, ["generate_story"]),
                    "generate_story": WorkflowNode("generate_story", NodeType.PROMPT, "生成故事内容", {"prompt_name": "storytelling"}, ["check_age"]),
                    "check_age": WorkflowNode("check_age", NodeType.DECISION, "检查年龄", {"condition": "age < 6"}, ["simplify_story", "narrate_story"]),
                    "simplify_story": WorkflowNode("simplify_story", NodeType.LLM, "简化故事", {"model": "llama3.2:1b"}, ["narrate_story"]),
                    "narrate_story": WorkflowNode("narrate_story", NodeType.TOOL, "讲述故事", {"tool": "text_to_speech"}, ["end"]),
                    "end": WorkflowNode("end", NodeType.END, "结束", {}, [])
                }, start_node="start", created_at="2024-01-01"
            ),
            "homework_helper": Workflow(
                workflow_id="homework_helper",
                name="作业辅导工作流",
                description="帮助小朋友完成作业",
                nodes={
                    "start": WorkflowNode("start", NodeType.START, "开始", {}, ["parse_question"]),
                    "parse_question": WorkflowNode("parse_question", NodeType.LLM, "解析题目", {"model": "llama3.2:1b"}, ["identify_subject"]),
                    "identify_subject": WorkflowNode("identify_subject", NodeType.DECISION, "识别科目", {}, ["math_handler", "language_handler", "science_handler"]),
                    "math_handler": WorkflowNode("math_handler", NodeType.PROMPT, "数学处理", {"prompt_name": "homework_help"}, ["generate_explanation"]),
                    "language_handler": WorkflowNode("language_handler", NodeType.PROMPT, "语言处理", {"prompt_name": "creative_writing"}, ["generate_explanation"]),
                    "science_handler": WorkflowNode("science_handler", NodeType.LLM, "科学处理", {"model": "llama3.2:1b"}, ["generate_explanation"]),
                    "generate_explanation": WorkflowNode("generate_explanation", NodeType.LLM, "生成解释", {"model": "llama3.2:1b"}, ["end"]),
                    "end": WorkflowNode("end", NodeType.END, "结束", {}, [])
                }, start_node="start", created_at="2024-01-05"
            ),
            "emotional_support": Workflow(
                workflow_id="emotional_support",
                name="情感支持工作流",
                description="提供情感陪伴和支持",
                nodes={
                    "start": WorkflowNode("start", NodeType.START, "开始", {}, ["detect_emotion"]),
                    "detect_emotion": WorkflowNode("detect_emotion", NodeType.LLM, "情感检测", {"model": "llama3.2:1b"}, ["select_response"]),
                    "select_response": WorkflowNode("select_response", NodeType.DECISION, "选择回应", {}, ["happy_response", "sad_response", "angry_response"]),
                    "happy_response": WorkflowNode("happy_response", NodeType.PROMPT, "开心回应", {"prompt_name": "emotional_support"}, ["end"]),
                    "sad_response": WorkflowNode("sad_response", NodeType.PROMPT, "难过回应", {"prompt_name": "emotional_support"}, ["offer_activities"]),
                    "angry_response": WorkflowNode("angry_response", NodeType.PROMPT, "生气回应", {"prompt_name": "emotional_support"}, ["end"]),
                    "offer_activities": WorkflowNode("offer_activities", NodeType.TOOL, "提供活动建议", {"tool": "activity_suggestion"}, ["end"]),
                    "end": WorkflowNode("end", NodeType.END, "结束", {}, [])
                }, start_node="start", created_at="2024-01-10"
            ),
            "language_learning": Workflow(
                workflow_id="language_learning",
                name="语言学习工作流",
                description="多语言学习工作流，包含角色扮演练习",
                nodes={
                    "start": WorkflowNode("start", NodeType.START, "开始", {}, ["assess_level"]),
                    "assess_level": WorkflowNode("assess_level", NodeType.LLM, "评估语言水平", {"model": "llama3.2:1b"}, ["choose_language"]),
                    "choose_language": WorkflowNode("choose_language", NodeType.DECISION, "选择学习语言", {}, ["vocabulary_lesson"]),
                    "vocabulary_lesson": WorkflowNode("vocabulary_lesson", NodeType.PROMPT, "词汇课程", {"prompt_name": "vocabulary"}, ["role_play"]),
                    "role_play": WorkflowNode("role_play", NodeType.PROMPT, "角色扮演", {"prompt_name": "role_play"}, ["feedback"]),
                    "feedback": WorkflowNode("feedback", NodeType.DECISION, "学习反馈", {"condition": "action == repeat"}, ["vocabulary_lesson", "end"]),
                    "end": WorkflowNode("end", NodeType.END, "结束", {}, [])
                }, start_node="start", created_at="2024-06-01"
            ),
            "quiz_challenge": Workflow(
                workflow_id="quiz_challenge",
                name="问答挑战工作流",
                description="交互式问答工作流，具有自适应难度调整",
                nodes={
                    "start": WorkflowNode("start", NodeType.START, "开始", {}, ["pick_topic"]),
                    "pick_topic": WorkflowNode("pick_topic", NodeType.LLM, "选择主题", {"model": "llama3.2:1b"}, ["generate_question"]),
                    "generate_question": WorkflowNode("generate_question", NodeType.PROMPT, "生成问题", {"prompt_name": "quiz"}, ["evaluate_answer"]),
                    "evaluate_answer": WorkflowNode("evaluate_answer", NodeType.PROMPT, "评估答案", {"prompt_name": "evaluate"}, ["adjust_difficulty"]),
                    "adjust_difficulty": WorkflowNode("adjust_difficulty", NodeType.DECISION, "调整难度", {"condition": "score >= 80"}, ["next_or_end"]),
                    "next_or_end": WorkflowNode("next_or_end", NodeType.DECISION, "继续或结束", {"condition": "has_next == true"}, ["generate_question", "end"]),
                    "end": WorkflowNode("end", NodeType.END, "结束", {}, [])
                }, start_node="start", created_at="2024-07-01"
            ),
            "daily_routine": Workflow(
                workflow_id="daily_routine",
                name="日常作息工作流",
                description="儿童日常作息安排工作流",
                nodes={
                    "start": WorkflowNode("start", NodeType.START, "开始", {}, ["morning_routine"]),
                    "morning_routine": WorkflowNode("morning_routine", NodeType.PROMPT, "晨间活动", {"prompt_name": "morning_routine", "activity": "起床、洗漱、早餐"}, ["learning_time"]),
                    "learning_time": WorkflowNode("learning_time", NodeType.PROMPT, "学习时间", {"prompt_name": "learning_time", "activity": "语文、数学、英语学习"}, ["break_time"]),
                    "break_time": WorkflowNode("break_time", NodeType.PROMPT, "休息时间", {"prompt_name": "break_time", "activity": "吃点心、户外活动"}, ["afternoon_activity"]),
                    "afternoon_activity": WorkflowNode("afternoon_activity", NodeType.PROMPT, "下午活动", {"prompt_name": "afternoon_activity", "activity": "绘画、音乐、运动"}, ["evening_routine"]),
                    "evening_routine": WorkflowNode("evening_routine", NodeType.PROMPT, "晚间活动", {"prompt_name": "evening_routine", "activity": "晚餐、洗澡、睡前故事"}, ["end"]),
                    "end": WorkflowNode("end", NodeType.END, "结束", {}, [])
                }, start_node="start", created_at="2024-08-01"
            )
        }

    def _has_cycle(self, workflow: Workflow) -> bool:
        visited = set()
        rec_stack = set()
        def dfs(nid):
            if nid in rec_stack:
                return True
            if nid in visited:
                return False
            visited.add(nid)
            rec_stack.add(nid)
            node = workflow.nodes.get(nid)
            if node:
                for edge in node.edges:
                    if dfs(edge):
                        return True
            rec_stack.discard(nid)
            return False
        return dfs(workflow.start_node)

    def get_all_workflows(self) -> List[Dict]:
        return [
            {"workflow_id": wf.workflow_id, "name": wf.name, "description": wf.description,
             "node_count": len(wf.nodes), "created_at": wf.created_at}
            for wf in self.workflows.values()
        ]

    def get_workflow(self, workflow_id: str) -> Optional[Dict]:
        wf = self.workflows.get(workflow_id)
        if not wf:
            return None
        return {
            "workflow_id": wf.workflow_id, "name": wf.name, "description": wf.description,
            "nodes": [{"node_id": n.node_id, "type": n.type.value, "label": n.label, "edges": n.edges}
                      for n in wf.nodes.values()],
            "start_node": wf.start_node
        }

    def create_workflow(self, workflow_id: str, name: str, description: str, nodes: List[Dict], start_node: str) -> Dict:
        if workflow_id in self.workflows:
            return {"success": False, "message": f"工作流 '{workflow_id}' 已存在"}
        wf_nodes = {}
        for n in nodes:
            try:
                ntype = NodeType(n["type"])
            except ValueError:
                return {"success": False, "message": f"未知节点类型: {n['type']}"}
            wf_nodes[n["node_id"]] = WorkflowNode(
                node_id=n["node_id"], type=ntype, label=n.get("label", ""),
                config=n.get("config", {}), edges=n.get("edges", [])
            )
        if start_node not in wf_nodes:
            return {"success": False, "message": f"起始节点 '{start_node}' 不存在"}
        workflow = Workflow(workflow_id=workflow_id, name=name, description=description,
                           nodes=wf_nodes, start_node=start_node, created_at=datetime.now().isoformat())
        if self._has_cycle(workflow):
            return {"success": False, "message": "工作流包含循环引用，请检查"}
        self.workflows[workflow_id] = workflow
        return {"success": True, "message": f"工作流 '{name}' 创建成功"}

    def execute_workflow(self, workflow_id: str, context: Dict, max_steps: int = 50) -> Dict:
        wf = self.workflows.get(workflow_id)
        if not wf:
            return {"success": False, "message": f"工作流 '{workflow_id}' 不存在"}

        execution = {
            "workflow_id": workflow_id, "name": wf.name, "steps": [],
            "context": context, "status": "running",
            "started_at": datetime.now().isoformat()
        }
        current_node_id = wf.start_node
        visited_nodes = set()
        step_count = 0

        while current_node_id and step_count < max_steps:
            step_count += 1
            if current_node_id in visited_nodes:
                execution["status"] = "cycle_detected"
                break
            visited_nodes.add(current_node_id)

            node = wf.nodes.get(current_node_id)
            if not node:
                execution["status"] = "error"
                execution["error"] = f"节点 '{current_node_id}' 不存在"
                break

            try:
                step_result = self._execute_node(node, execution["context"])
            except WorkflowExecutionError as e:
                execution["status"] = "error"
                execution["error"] = str(e)
                break

            execution["steps"].append({
                "node_id": current_node_id, "label": node.label,
                "type": node.type.value, "result": step_result
            })

            if node.type == NodeType.END:
                current_node_id = None
            elif node.type == NodeType.DECISION:
                current_node_id = self._evaluate_decision(node, step_result)
            else:
                current_node_id = node.edges[0] if node.edges else None

        if current_node_id is None:
            execution["status"] = "completed"
        elif step_count >= max_steps:
            execution["status"] = "max_steps_exceeded"
        execution["finished_at"] = datetime.now().isoformat()
        execution["step_count"] = len(execution["steps"])

        self.execution_history.append(execution)

        return {"success": execution["status"] == "completed", "execution": execution}

    def _execute_node(self, node: WorkflowNode, context: Dict) -> Dict:
        if node.type == NodeType.START:
            return {"status": "started"}
        if node.type == NodeType.END:
            return {"status": "completed"}
        if node.type == NodeType.PROMPT:
            pname = node.config.get("prompt_name")
            return {"status": "prompt_rendered", "prompt_name": pname}
        if node.type == NodeType.LLM:
            model = node.config.get("model")
            try:
                from children_langchain import langchain_integration
                input_text = context.get("input", str(context))
                result = langchain_integration.execute_chain([
                    {"type": "prompt", "name": "conversation"},
                    {"type": "model", "name": model or "llama3.2:1b"}
                ], {"input": input_text})
                response = result.get("response")
                if not response:
                    raise RuntimeError("LangChain returned empty response")
                return {"status": "llm_called", "model": model, "response": response}
            except Exception as e:
                logger.warning("LLM call failed, returning error to caller: %s", e)
                return {"status": "llm_failed", "model": model, "error": str(e)}
        if node.type == NodeType.TOOL:
            tool = node.config.get("tool")
            tool_results = {
                "text_to_speech": "语音播放完成",
                "activity_suggestion": "推荐活动：画画、听音乐、做游戏"
            }
            return {"status": "tool_called", "tool": tool, "result": tool_results.get(tool, "工具执行结果")}
        if node.type == NodeType.DECISION:
            condition = node.config.get("condition", "")
            result_value: Any = False
            if "age" in condition:
                age = int(context.get("age", 10))
                threshold = int(''.join(filter(str.isdigit, condition)) or 6)
                result_value = age < threshold
            elif "score" in condition:
                score = float(context.get("score", 50))
                threshold = float(''.join(c for c in condition.split()[-1] if c.isdigit() or c == '.') or 60)
                result_value = score >= threshold
            elif "==" in condition:
                parts = [p.strip() for p in condition.split("==")]
                result_value = context.get(parts[0], "") == parts[1] if len(parts) == 2 else False
            elif not condition:
                result_value = context.get("emotion", "neutral")
            else:
                result_value = context.get("subject", "").lower()
            return {"status": "decision_made", "condition": condition, "result": result_value}
        if node.type == NodeType.BRANCH:
            bk = context.get("branch", "default")
            return {"status": "branch", "branch": bk, "result": bk}
        return {"status": "executed"}

    def _evaluate_decision(self, node: WorkflowNode, result: Dict) -> Optional[str]:
        if len(node.edges) == 1:
            return node.edges[0]
        result_val = result.get("result")
        if isinstance(result_val, bool):
            return node.edges[0] if result_val else (node.edges[1] if len(node.edges) > 1 else None)
        if isinstance(result_val, str) and len(node.edges) > 2:
            for edge in node.edges:
                if result_val in edge:
                    return edge
            return node.edges[0]
        if result_val and len(node.edges) > 0:
            return node.edges[0]
        return node.edges[1] if len(node.edges) > 1 else None

    def get_execution_history(self, limit: int = 10) -> List[Dict]:
        return self.execution_history[-limit:]

    def reset_execution_history(self):
        self.execution_history.clear()

langgraph_workflow = LangGraphWorkflow()
