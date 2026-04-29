FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /src
COPY NuGet.Config ./
COPY CoachingSaaS.Api/CoachingSaaS.Api.csproj CoachingSaaS.Api/
RUN dotnet restore CoachingSaaS.Api/CoachingSaaS.Api.csproj --configfile NuGet.Config
COPY CoachingSaaS.Api/ CoachingSaaS.Api/
RUN dotnet publish CoachingSaaS.Api/CoachingSaaS.Api.csproj -c Release -o /app/publish --no-restore

FROM mcr.microsoft.com/dotnet/aspnet:8.0
WORKDIR /app
ENV ASPNETCORE_URLS=http://+:8080
COPY --from=build /app/publish .
EXPOSE 8080
ENTRYPOINT ["dotnet", "CoachingSaaS.Api.dll"]
