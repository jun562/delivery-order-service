package com.jun.webserver.controller;

import com.jun.webserver.domain.ChatMessage;
import com.jun.webserver.dto.ChatMessageDto;
import com.jun.webserver.repository.ChatRepository;
import java.time.LocalDateTime;
import lombok.RequiredArgsConstructor;
import org.springframework.messaging.handler.annotation.DestinationVariable;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.SendTo;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequiredArgsConstructor
public class ChatController {
    private final ChatRepository chatRepository;

    @MessageMapping("/chat/{orderId}")
    // 해당 orderId 방에만 전송
    @SendTo("/sub/chat/{orderId}")
    public ChatMessageDto sendMessage(@DestinationVariable String orderId, ChatMessageDto messageDto) {
        ChatMessage message = ChatMessage.builder()
                .orderId(orderId)
                .sender(messageDto.getSender())
                .content(messageDto.getContent())
                .timestamp(LocalDateTime.now())
                .build();

        chatRepository.save(message);

        return messageDto;
    }
}
