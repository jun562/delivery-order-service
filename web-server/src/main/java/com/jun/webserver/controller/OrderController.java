package com.jun.webserver.controller;

import com.jun.grpc.order.CreateOrderRequest;
import com.jun.grpc.order.CreateOrderResponse;
import com.jun.grpc.order.OrderServiceGrpc;
import com.jun.webserver.dto.OrderRequestDto;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;

@Controller
public class OrderController {
    private OrderServiceGrpc.OrderServiceBlockingStub orderStub;

    @PostMapping("/orders")
    public String createOrder(@RequestBody OrderRequestDto requestDto) {
        CreateOrderRequest grpcRequest = CreateOrderRequest.newBuilder()
                .setCustomerId(requestDto.getCustomerId())
                .setRestaurantId(requestDto.getRestaurantId())
                .setMenuName(requestDto.getMenuName())
                .setPrice(requestDto.getPrice())
                .build();

        CreateOrderResponse response = orderStub.createOrder(grpcRequest);

        return "주문 성공! 주문번호: " + response.getOrderId();
    }
}
