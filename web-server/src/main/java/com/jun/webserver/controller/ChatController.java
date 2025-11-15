package com.jun.webserver.controller;

import com.jun.webserver.dto.ChatMessage;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.SendTo;
import org.springframework.stereotype.Controller;

@Controller
public class ChatController {
    // 클라이언트가 "/pub/chat" 으로 메시지 보낼 시, 메서드 처리
    @MessageMapping("/chat")
    // 반환 값을 "/sub/chat" 을 구독 중인 모든 클라이언트에게 전달
    @SendTo("/sub/chat")
    public ChatMessage sendMessage(ChatMessage message) {
        System.out.println("채팅 수신: " + message.getContent() + " from " + message.getSender());
        return message;
    }
}
