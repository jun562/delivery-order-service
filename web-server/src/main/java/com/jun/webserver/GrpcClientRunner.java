package com.jun.webserver;

import com.jun.grpc.simple.GreetRequest;
import com.jun.grpc.simple.GreetResponse;
import com.jun.grpc.simple.SimpleServiceGrpc;
import net.devh.boot.grpc.client.inject.GrpcClient;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;

// 스프링 앱 구동 시 바로 실행
@Component
public class GrpcClientRunner implements CommandLineRunner {
    // gRPC 클라이언트 Stub 주입
    @GrpcClient("order-service")
    private SimpleServiceGrpc.SimpleServiceBlockingStub simpleStub;

    @Override
    public void run(String... args) throws Exception {
        System.out.println("========================================");
        System.out.println("[web-server] gRPC 요청 보낼 준비 완료");

        try {
            // 요청 데이터 생성
            GreetRequest request = GreetRequest.newBuilder().setName("Web-Server").build();
            // gRPC 호출 ( 9090 포트로 전송 )
            // 응답이 올 때 까지 기다림
            System.out.println("[web-server] order-server에게 요청 보내는 중...");
            GreetResponse response = simpleStub.greet(request);

            // 응답 확인("[
            System.out.println("[web-server] 응답 받음: " + response.getMessage());


        } catch (Exception e) {
            System.err.println("[web-server] gRPC 호출 실패");
            e.printStackTrace();
        }
        System.out.println("======================================");
    }
}
