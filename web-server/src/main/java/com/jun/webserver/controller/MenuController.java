package com.jun.webserver.controller;

import com.jun.grpc.order.Empty;
import com.jun.grpc.order.MenuListResponse;
import com.jun.grpc.order.MenuRequest;
import com.jun.grpc.order.MenuResponse;
import com.jun.grpc.order.MenuServiceGrpc;
import com.jun.webserver.dto.MenuRequestDto;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;
import net.devh.boot.grpc.client.inject.GrpcClient;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class MenuController {

    @GrpcClient("order-service")
    private MenuServiceGrpc.MenuServiceBlockingStub menuStub;

    // 1. 메뉴 추가 API
    @PostMapping("/menus")
    public String addMenu(@RequestBody MenuRequestDto requestDto) {
        MenuRequest grpcRequest = MenuRequest.newBuilder()
                .setName(requestDto.getName())
                .setPrice(requestDto.getPrice())
                .setDescription(requestDto.getDescription())
                .build();

        MenuResponse response = menuStub.addMenu(grpcRequest);
        return "메뉴 등록 성공! ID: " + response.getId();
    }

    // 2. 메뉴 목록 조회 API
    @GetMapping("/menus")
    public List<Map<String, Object>> getMenus() {

        MenuListResponse response = menuStub.getMenus(Empty.newBuilder().build());

        return response.getMenusList().stream()
                .map(menu -> Map.<String, Object>of(
                        "id", menu.getId(),
                        "name", menu.getName(),
                        "price", menu.getPrice()
                ))
                .collect(Collectors.toList());
    }
}
