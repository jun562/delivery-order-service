package com.jun.webserver;

import com.jun.grpc.order.CreateOrderRequest;
import com.jun.grpc.order.CreateOrderResponse;
import com.jun.grpc.order.OrderServiceGrpc;
import net.devh.boot.grpc.client.inject.GrpcClient;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;

@Component
public class GrpcClientRunner implements CommandLineRunner {

    // 변경된 Stub 이름 확인!
    @GrpcClient("order-service")
    private OrderServiceGrpc.OrderServiceBlockingStub orderStub;

    @Override
    public void run(String... args) throws Exception {
        System.out.println("========================================");

        try {
            // 주문 생성 테스트 데이터
            CreateOrderRequest request = CreateOrderRequest.newBuilder()
                    .setCustomerId("customer1")
                    .setRestaurantId("store1")
                    .setMenuName("황금올리브 치킨")
                    .setPrice(23000)
                    .build();

            System.out.println("📤 [web-server] 치킨 주문 전송 중...");

            // gRPC 호출
            CreateOrderResponse response = orderStub.createOrder(request);

            System.out.println("📥 [web-server] 주문 결과 수신!");
            System.out.println(" - Order ID: " + response.getOrderId());
            System.out.println(" - Status: " + response.getStatus());

        } catch (Exception e) {
            System.err.println("❌ 통신 실패: " + e.getMessage());
        }

        System.out.println("========================================");
    }
}
